// Same-origin proxy for TheRundown's hosted sports-odds MCP (https://mcp.therundown.io/mcp).
//
// The MCP endpoint rejects browser Origins (403) and wants the Product API key in a header, so
// it cannot be called from a page without leaking the key. This route holds the key server-side,
// calls the MCP tool, and flattens the reply into the small shape the board needs.
//
//   GET /api/rundown?league=NFL&date=2026-11-08&days=2
//
// Datapoints are metered per response (20k/day on the free tier, and one league-day costs
// 1.5k-5k), so every reply is cached for 900s at the edge in addition to the in-process TTL.
// Repeats inside that window are served from cache and cost nothing. When the provider
// returns 429 the route serves the last good body marked `stale` instead of blanking the
// board.
//
// THERUNDOWN_API_KEY must be set in the environment (Vercel project env vars, or .env.local
// for local dev). Without it the route answers 200 with `missing_key: true` so the UI can say
// why instead of showing a 401 it cannot explain.

const MCP_URL = 'https://mcp.therundown.io/mcp';
const TTL_MS = 900_000;

/** Sport ID per site league. TheRundown sport IDs are stable. */
export const SPORT_IDS: Record<string, number> = {
  CFB: 1,
  NFL: 2,
  MLB: 3,
  NBA: 4,
  CBB: 5,
  NHL: 6,
  MMA: 7,
  WNBA: 8,
  CFL: 9,
  MLS: 10,
  EPL: 11,
  UCL: 16,
  UFC: 7,
  GOLF: 40,
  F1: 41,
};

/** Sportsbook affiliate id -> the board's display id. */
const BOOKS: Array<[number, string]> = [
  [3, 'pinnacle'],
  [32, 'circa'],
  [19, 'dk'],
  [23, 'fd'],
  [35, 'czr'],
  [22, 'mgm'],
  [30, 'novig'],
  [25, 'kalshi'],
];

const AFFILIATE_IDS = BOOKS.map(([id]) => id).join(',');

interface Price {
  price?: number;
  is_main_line?: boolean;
}
interface TeamLine {
  value?: number | string;
  prices?: Record<string, Price>;
}
interface Participant {
  id?: number;
  name?: string;
  mascot?: string;
  abbreviation?: string;
  is_home?: boolean;
  is_away?: boolean;
  lines?: TeamLine[];
}
interface Market {
  market_id?: number;
  period_id?: number;
  participants?: Participant[];
}

interface BookRow {
  /** Away-side moneyline, which is the side the board's ML column shows. */
  mlAway?: number;
  mlHome?: number;
  /** Away-side handicap and its price. */
  spread?: string;
  spreadPrice?: string;
  spreadHome?: string;
  spreadHomePrice?: string;
  /** Full-game total, unsigned. */
  total?: string;
  overPrice?: string;
  underPrice?: string;
}

interface Slate {
  event_id: string;
  league: string;
  start_time: number;
  home_abbr?: string;
  away_abbr?: string;
  status: string;
  home: string;
  away: string;
  books: Record<string, BookRow>;
}

const cache = new Map<string, { at: number; body: any }>();

const num = (v?: number | string) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

const fmt = (raw?: number | string) => {
  const n = num(raw);
  if (n === undefined) return undefined;
  return n === 0 ? 'PK' : n > 0 ? `+${n}` : `${n}`;
};
const am = (n?: number) => (typeof n === 'number' && Number.isFinite(n) ? (n > 0 ? `+${n}` : `${n}`) : undefined);

/** The book's main line for one participant, falling back to the first quoted line. */
const lineFor = (p: Participant, book: string): TeamLine | undefined => {
  const lines = p.lines || [];
  const quoted = lines.filter((l) => l.prices && l.prices[book]);
  const main = quoted.find((l) => l.prices?.[book]?.is_main_line);
  return main || quoted[0];
};

const priceAt = (l?: TeamLine, book?: string) => (l && book ? l.prices?.[book]?.price : undefined);

/** Match a market participant to the event's home/away/over/under slot by name. */
const slotOf = (p: Participant, home: string, away: string) => {
  const name = (p.name || '').toLowerCase();
  if (/^over\b/.test(name)) return 'over' as const;
  if (/^under\b/.test(name)) return 'under' as const;
  if (!name) return undefined;
  const h = home.toLowerCase();
  const a = away.toLowerCase();
  if (name === h || h.includes(name) || name.includes(h)) return 'home' as const;
  if (name === a || a.includes(name) || name.includes(a)) return 'away' as const;
  return undefined;
};

const buildBooks = (markets: Market[], home: string, away: string): Record<string, BookRow> => {
  const books: Record<string, BookRow> = {};
  const full = markets.filter((m) => (m.period_id ?? 0) === 0);

  const pick = (marketId: number, slot: 'home' | 'away' | 'over' | 'under') => {
    const market = full.find((m) => m.market_id === marketId);
    if (!market) return undefined;
    return (market.participants || []).find((p) => slotOf(p, home, away) === slot);
  };

  const mlHome = pick(1, 'home');
  const mlAway = pick(1, 'away');
  const hcHome = pick(2, 'home');
  const hcAway = pick(2, 'away');
  const ov = pick(3, 'over');
  const un = pick(3, 'under');

  for (const [affId, id] of BOOKS) {
    const book = String(affId);
    const row: BookRow = {};

    const h = priceAt(lineFor(mlHome || {}, book), book);
    const a = priceAt(lineFor(mlAway || {}, book), book);
    if (typeof h === 'number') row.mlHome = h;
    if (typeof a === 'number') row.mlAway = a;

    const hcHL = hcHome ? lineFor(hcHome, book) : undefined;
    if (hcHL && hcHL.value !== undefined) {
      row.spreadHome = fmt(hcHL.value);
      const px = priceAt(hcHL, book);
      if (typeof px === 'number') row.spreadHomePrice = am(px);
    }
    const hcAL = hcAway ? lineFor(hcAway, book) : undefined;
    if (hcAL && hcAL.value !== undefined) {
      row.spread = fmt(hcAL.value);
      const px = priceAt(hcAL, book);
      if (typeof px === 'number') row.spreadPrice = am(px);
    }

    const ovL = ov ? lineFor(ov, book) : undefined;
    if (ovL && ovL.value !== undefined) {
      row.total = fmt(ovL.value)?.replace(/^\+/, '');
      const px = priceAt(ovL, book);
      if (typeof px === 'number') row.overPrice = am(px);
    }
    const unL = un ? lineFor(un, book) : undefined;
    const upx = unL ? priceAt(unL, book) : undefined;
    if (typeof upx === 'number') row.underPrice = am(upx);

    if (Object.keys(row).length) books[id] = row;
  }
  return books;
};

export const toSlate = (e: any, league: string): Slate => {
  const teams: Participant[] = e.teams || [];
  const home = teams.find((t) => t.is_home);
  const away = teams.find((t) => t.is_away);
  const homeName = `${home?.name || ''} ${home?.mascot || ''}`.trim() || 'Home';
  const awayName = `${away?.name || ''} ${away?.mascot || ''}`.trim() || 'Away';
  const status = String(e.score?.event_status || 'STATUS_SCHEDULED').replace('STATUS_', '').toLowerCase();
  return {
    event_id: e.event_id,
    league,
    start_time: Math.floor(new Date(e.event_date || 0).getTime() / 1000) || 0,
    status,
    home: homeName,
    away: awayName,
    home_abbr: String(home?.abbreviation || '').toUpperCase() || undefined,
    away_abbr: String(away?.abbreviation || '').toUpperCase() || undefined,
    books: buildBooks(e.markets || [], homeName, awayName),
  };
};

/** One MCP tools/call, returning parsed JSON from the SSE-ish response. */
async function callTool(key: string, name: string, args: unknown): Promise<any> {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'x-therundown-key': key,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
  });
  const text = await res.text();
  let json: any;
  if (text.trim().startsWith('{')) {
    json = JSON.parse(text);
  } else {
    const line = text.split('\n').find((l) => l.startsWith('data:'));
    if (!line) throw new Error(`MCP ${name} -> ${res.status} ${text.slice(0, 160)}`);
    json = JSON.parse(line.slice(5));
  }
  if (json.error) throw new Error(json.error.message || 'MCP error');
  const content = json.result?.content || [];
  for (const c of content) {
    if (c.type === 'text') {
      try {
        return JSON.parse(c.text);
      } catch {
        return { text: c.text };
      }
    }
  }
  return json.result ?? {};
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const league = (url.searchParams.get('league') || 'NFL').toUpperCase();
  const days = Math.min(Math.max(Number(url.searchParams.get('days') || 1), 1), 3);
  const startDate = url.searchParams.get('date') || isoDate(new Date());
  const sportId = SPORT_IDS[league];

  if (!sportId) {
    return Response.json({ events: [], error: `no TheRundown sport for ${league}` }, { status: 400 });
  }

  const key = process.env.THERUNDOWN_API_KEY;
  if (!key) {
    return Response.json(
      {
        events: [],
        missing_key: true,
        message: 'Set THERUNDOWN_API_KEY in the environment to enable live odds.',
      },
      { status: 200 }
    );
  }

  const cacheKey = `${league}:${startDate}:${days}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return Response.json({ ...hit.body, cached: true }, { headers: { 'cache-control': 'public, s-maxage=900, stale-while-revalidate=1800' } });
  }

  const dates: string[] = [];
  const base = new Date(`${startDate}T12:00:00Z`);
  for (let i = 0; i < days; i += 1) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    dates.push(isoDate(d));
  }

  // Local verification only: replay a recorded MCP payload instead of spending datapoints.
  // Set RUNDOWN_FIXTURE to a file path holding `{ events: [...] }` from
  // v2GetEventsBySportAndDate. Never set in a deployed environment.
  const fixture = process.env.RUNDOWN_FIXTURE;
  if (fixture && !process.env.VERCEL) {
    try {
      const { readFileSync } = await import('node:fs');
      const raw = JSON.parse(readFileSync(fixture, 'utf8'));
      const events = (raw.events || []).map((e: any) => toSlate(e, league));
      return Response.json(
        { league, sport_id: sportId, dates, source: 'fixture', fetched_at: new Date().toISOString(), usage: null, events },
        { headers: { 'cache-control': 'no-store' } }
      );
    } catch (err: any) {
      return Response.json({ events: [], error: `fixture: ${err?.message}` }, { status: 500 });
    }
  }

  const events: Slate[] = [];
  let usage: any = undefined;

  for (const date of dates) {
    try {
      const body = await callTool(key, 'v2GetEventsBySportAndDate', {
        path: { sportID: sportId, date },
        query: { market_ids: '1,2,3', affiliate_ids: AFFILIATE_IDS, offset: 420, main_line: true },
      });
      usage = body?.usage || usage;

      // The provider reports quota/entitlement problems as a normal tool result, not a
      // JSON-RPC error, so an unguarded read would look like "no games today".
      const upstreamError = body?.error || (body?.status && body.status >= 400 ? body : undefined);
      if (upstreamError) {
        const retryAfter = Number(body?.retry_after || 0);
        const stale = cache.get(cacheKey);
        const message = body?.message || String(body?.error || 'upstream error');
        if (stale) {
          return Response.json(
            { ...stale.body, stale: true, cached: true, error: message, retry_after: retryAfter },
            { headers: { 'cache-control': 'no-store' } }
          );
        }
        return Response.json(
          {
            events,
            usage,
            error: message,
            limited: /limit|quota|usage|entitlement|429/i.test(message),
            retry_after: retryAfter,
          },
          { status: 200, headers: { 'cache-control': 'no-store' } }
        );
      }

      const list = body?.data?.events || [];
      for (const e of list) events.push(toSlate(e, league));
    } catch (err: any) {
      const message = err?.message || String(err);
      if (/denied|403|entitlement|datapoint/i.test(message)) {
        return Response.json({ events, usage, error: message, limited: true }, { status: 200 });
      }
      return Response.json({ events, usage, error: message }, { status: 502 });
    }
  }

  const body = {
    league,
    sport_id: sportId,
    dates,
    source: 'therundown',
    fetched_at: new Date().toISOString(),
    usage: usage || null,
    events: events.sort((a, b) => a.start_time - b.start_time),
  };
  cache.set(cacheKey, { at: Date.now(), body });
  return Response.json(body, { headers: { 'cache-control': 'public, s-maxage=900, stale-while-revalidate=1800' } });
}
