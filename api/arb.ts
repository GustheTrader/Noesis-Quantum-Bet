// Cross-venue arbitrage board across the four prediction exchanges:
// Kalshi, Polymarket, Novig, ProphetX.
//
// Each venue publishes its own prices in its own shape. This route normalizes all
// four into one Row, then lib/xvenue.ts does the only math that matters: convert
// every price to the true probability at which that buy breaks even, after that
// venue's fee shape. A locked trade is `breakeven_buy(A ask) + breakeven_buy(B, 1 - bid) < 1`.
//
//   GET /api/arb?league=nfl        -> rows + arbs + quotes + per-venue health
//   GET /api/arb?league=nfl&raw=1  -> normalized rows only
//
// Venue access as measured 2026-11-09:
//   Kalshi        public read, no auth, but aggressively rate-limited (429).
//   Polymarket    public Gamma + CLOB, no auth.
//   Novig         public unsigned catalog only; paper host by default.
//   ProphetX      needs PROPHETX_API_KEY + PROPHETX_SECRET_KEY to mint a token.
//
// Nothing signed or keyed ever reaches the browser: ProphetX's token is minted
// here and used here.

import { compare, findArbs, quoteSheet, valueBets, Row, Venue, DEFAULT_OPTS } from '../lib/xvenue';

const NOVIG_HOST = (process.env.NOVIG_HOST || 'https://api.novig.com').replace(/\/$/, '');
const NOVIG_ALLOWED = new Set(['https://api.paper.novig.com', 'https://api.novig.com']);
const KALSHI = 'https://api.elections.kalshi.com/trade-api/v2';
const GAMMA = 'https://gamma-api.polymarket.com';
const CLOB = 'https://clob.polymarket.com';
const PX = 'https://cash.api.prophetx.co/partner';

interface League {
  key: string;
  espn: string;
  novig: string;
  kalshi: string[];
  pxTournament: number;
}

const LEAGUES: Record<string, League> = {
  nfl: { key: 'nfl', espn: 'football/nfl', novig: 'NFL', kalshi: ['KXNFLGAME', 'KXNFLSPREAD', 'KXNFLTOTAL'], pxTournament: 31 },
  cfb: { key: 'cfb', espn: 'football/college-football', novig: 'NCAAF', kalshi: ['KXNCAAFGAME', 'KXCFBGAME'], pxTournament: 32 },
};

type Health = { venue: string; ok: boolean; rows: number; note?: string };

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Date-pinned game key. Two games between the same teams in different weeks are
 *  different markets, so the date is part of the key. */
function gameKey(date: string, a: string, b: string): string {
  const pair = [a, b].sort().join('|');
  return `${date}|${pair}`;
}

/** Novig market types -> our families. Novig quotes 0-1 contracts, so the price
 *  IS the probability and needs no de-vig. */
const NOVIG_FAMILY: Record<string, string> = {
  SPREAD: 'SPREAD',
  MONEY: 'ML',
  TOTAL: 'TOTAL',
};

/** Novig's catalog: markets carry only a strike in `description` ("GB +10.5") and
 *  an `eventId`; the matchup and start time live on the event. So pull events
 *  first, index by id, then read typed market pages. Response key is `items`.
 *
 *  Novig contracts settle 0-1, so the quoted price IS the probability. */
const NOVIG_TYPES = ['SPREAD', 'MONEY'];

async function novigRows(
  league: League,
  now: number,
  health: Health[],
  teams: Map<string, string>,
): Promise<Row[]> {
  if (!NOVIG_ALLOWED.has(NOVIG_HOST)) {
    health.push({ venue: 'novig', ok: false, rows: 0, note: `host not allowed: ${NOVIG_HOST}` });
    return [];
  }
  const get = async (path: string): Promise<any> =>
    fetch(`${NOVIG_HOST}/v3/public/catalog/${path}`, { headers: UA })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

  const events = new Map<string, { date: string; away: string; home: string; start: number }>();
  for (let cursor = ''; ; ) {
    const data = await get(
      `events?league=${league.novig}&limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    );
    const batch: any[] = data?.items ?? [];
    for (const e of batch) {
      const id = String(e?.eventId ?? '');
      const desc = String(e?.description ?? '');
      const start = Number(e?.startsTs ?? 0);
      if (!id || !desc.includes('@') || !start) continue;
      const [awayRaw, homeRaw] = desc.split('@').map((t: string) => t.trim());
      const away = canon(teams, awayRaw);
      const home = canon(teams, homeRaw);
      if (!away || !home) continue;
      events.set(id, { date: new Date(start).toISOString().slice(0, 10), away, home, start });
    }
    cursor = nextCursor(data);
    if (!cursor) break;
  }

  const rows: Row[] = [];
  const seenMarket = new Set<string>();
  for (const type of NOVIG_TYPES) {
    for (let cursor = ''; ; ) {
      const data = await get(
        `markets?league=${league.novig}&marketType=${type}&limit=200${
          cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
        }`,
      );
      const batch: any[] = data?.items ?? [];
      for (const m of batch) {
        const family = NOVIG_FAMILY[String(m?.marketType ?? '')];
        if (!family) continue;
        const ev = events.get(String(m?.eventId ?? ''));
        if (!ev) continue;
        const outs: any[] = m.outcomes ?? [];
        if (outs.length !== 2) continue;
        for (const o of outs) {
          const label = String(o?.name ?? '');
          const side = canon(teams, label.replace(/\s*[+-]?\d+(\.\d+)?\s*$/, '').trim());
          if (!side) continue;
          const bid = num(o?.bid?.price);
          const ask = num(o?.ask?.price);
          if (bid === null && ask === null) continue;
          const key = `${m.marketId ?? m.id ?? ''}|${o?.outcomeId ?? o?.name ?? ''}`;
          if (seenMarket.has(key)) continue;
          seenMarket.add(key);
          rows.push({
            venue: 'novig',
            family,
            event: gameKey(ev.date, ev.away, ev.home),
            side,
            // Novig publishes one unsigned strike per market; the sign lives in the
            // outcome label ("GB +10.5", "MIN -10.5"). Store each team's own signed
            // handicap so it matches the way Polymarket and Kalshi quote the same bet.
            line: signedLine(label, num(m.strike), family),
            bid,
            ask: ask ?? bid,
            bidSize: num(o?.bid?.qty),
            askSize: num(o?.ask?.qty),
            live: ev.start * 1000 < Date.now(),
            seenAt: now,
          });
        }
      }
      cursor = nextCursor(data);
      if (!cursor) break;
    }
  }
  health.push({
    venue: 'novig',
    ok: rows.length > 0,
    rows: rows.length,
    note: `${events.size} events${NOVIG_HOST.includes('paper') ? ' · paper' : ''}`,
  });
  return rows;
}

/** Team names as each feed spells them -> the abbreviation the other three use.
 *  Polymarket writes "49ers", Novig and Kalshi write "SF"; without this map the
 *  same game never matches across venues. */
function teamMap(games: any[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const g of games) {
    const comp = g?.competitions?.[0];
    for (const c of comp?.competitors ?? []) {
      const abbr = String(c?.team?.abbreviation ?? '').trim().toUpperCase();
      if (!abbr) continue;
      const names = [
        c.team.displayName,
        c.team.name,
        c.team.shortDisplayName,
        c.team.nickname,
        c.team.location,
      ];
      for (const n of names) {
        if (!n) continue;
        const k = String(n).toLowerCase().trim();
        if (k) map.set(k, abbr);
      }
      // "49ers" and "niners" both appear in Polymarket question text.
      const nick = String(c.team.name ?? '').toLowerCase().trim();
      if (nick) {
        map.set(nick.replace(/^the\s+/, ''), abbr);
        if (nick.endsWith('ers')) map.set(nick.slice(0, -1), abbr);
      }
      map.set(abbr.toLowerCase(), abbr);
    }
  }
  return map;
}

/** Same mapping from a flat `/teams` list ([{team:{...}}]) rather than a schedule. */
function teamMapFromList(list: any[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const t0 of list) {
    const t = t0?.team ?? t0;
    const abbr = String(t?.abbreviation ?? '').trim().toUpperCase();
    if (!abbr) continue;
    for (const n of [t.displayName, t.name, t.shortDisplayName, t.nickname, t.location, abbr]) {
      if (!n) continue;
      const k = String(n).toLowerCase().trim();
      if (k) map.set(k, abbr);
    }
    const nick = String(t.name ?? '').toLowerCase().trim();
    if (nick) {
      map.set(nick.replace(/^the\s+/, ''), abbr);
      if (nick.endsWith('ers')) map.set(nick.slice(0, -1), abbr);
    }
  }
  return map;
}

/** Novig's `next` token repeats the SAME page instead of advancing (measured
 *  2026-11-09: 9 pages, 200 distinct markets, 1,400 repeats). Paging on it is an
 *  infinite loop that the downstream dedupe then silently flattens — and a
 *  flattened duplicate collapses bid and ask onto one price, which is how
 *  "cheapest buy" and "best lay" ended up on the same venue at the same number.
 *  A cursor that only returns already-seen rows ends pagination. */
const seenCursors = new Set<string>();
function nextCursor(data: any): string {
  const c = String(data?.next ?? '');
  if (!c || c === 'null' || c === 'undefined') return '';
  if (seenCursors.has(c)) return '';
  seenCursors.add(c);
  return c;
}

const UA = { accept: 'application/json', 'user-agent': 'noesis-quantum-bet/1.0' };

/** Reduce any venue's spelling of a team to the canonical ESPN abbreviation, so
 *  "Los Angeles Chargers", "Chargers", "LAC" and "lac" all collapse to one key. */
function canon(teams: Map<string, string>, raw: string): string | null {
  const k = String(raw ?? '')
    .toLowerCase()
    .replace(/[.]/g, '')
    .replace(/^the\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!k) return null;
  const hit = teams.get(k);
  if (hit) return hit;
  // Fall back to a suffix/prefix match on the nickname ("chargers" in a longer string).
  for (const [name, abbr] of teams) {
    if (name.length < 4) continue;
    if (k.includes(name) || name.includes(k)) return abbr;
  }
  return null;
}

/** Every team in the league, not just the ones playing this week. Bye weeks and  return null;
}

/** Read the handicap sign off a selection label and keep each team's own number.
 *  "MIN -10.5" -> -10.5, "GB +10.5" -> +10.5, "Over 32.5" -> 32.5, moneylines -> null.
 *  Storing the signed per-team line is what makes the same bet comparable across
 *  venues; a shared unsigned strike would put GB -10.5 and MIN -10.5 in one bucket. */
function signedLine(label: string, strike: number | null, family: string): number | null {
  if (family === 'ML' || strike === null) return null;
  if (family === 'TOTAL') return Math.abs(strike);
  const m = label.match(/\s*([+-])\s*(\d+(?:\.\d+)?)\s*$/);
  if (!m) return strike;
  return m[1] === '-' ? -Math.abs(strike) : Math.abs(strike);
}

/** Every team in the league, not just the ones playing this week. Bye weeks and
 *  future slates would otherwise leave holes in the name map. */
async function leagueTeams(league: League): Promise<Map<string, string>> {
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${league.espn}/teams`, {
    headers: UA,
  }).catch(() => null);
  const json: any = res && res.ok ? await res.json().catch(() => null) : null;
  const list: any[] = json?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  const map = teamMapFromList(list);
  if (map.size) return map;
  // /teams can 403 or change shape; the scoreboard still carries every team playing.
  const sb = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${league.espn}/scoreboard`, {
    headers: UA,
  }).catch(() => null);
  const sbJson: any = sb && sb.ok ? await sb.json().catch(() => null) : null;
  return teamMap(sbJson?.events ?? []);
}

/** Polymarket builds one binary market per rung of a spread ladder ("Spread:
 *  49ers (-3.5)"), so a game is only comparable to the other venues on the exact
 *  rungs it lists. We read the week's NFL/CFB events, keep only game slugs, and
 *  convert each rung into the same (side, line) shape Novig and Kalshi publish. */
async function polymarketRows(
  league: League,
  now: number,
  health: Health[],
  teams: Map<string, string>,
): Promise<Row[]> {
  const rows: Row[] = [];
  const tagId = league.key === 'nfl' ? 450 : 100351;
  const slugRe = league.key === 'nfl' ? /^nfl-[a-z]{2,3}-[a-z]{2,3}-\d{4}-\d{2}-\d{2}$/ : /^cfb-/;

  const from = new Date(Date.now() - 6 * 3600_000).toISOString();
  const to = new Date(Date.now() + 9 * 86400_000).toISOString();
  const listUrl =
    `${GAMMA}/events?closed=false&limit=100&order=startDate&ascending=true` +
    `&tag_id=${tagId}&end_date_min=${from}&end_date_max=${to}`;
  const listRes = await fetch(listUrl, { headers: { Accept: 'application/json' } }).catch(() => null);
  if (!listRes || !listRes.ok) {
    health.push({ venue: 'polymarket', ok: false, rows: 0, note: `HTTP ${listRes?.status ?? 'network'}` });
    return rows;
  }
  const events: any[] = await listRes.json().catch(() => []);
  const games = (Array.isArray(events) ? events : []).filter((e) => slugRe.test(String(e?.slug ?? '')));

  for (const ev of games) {
    const date = String(ev.slug).slice(-10);
    const parts: any[] = Array.isArray(ev.markets) ? ev.markets : [];

    // Pass 1: which two teams does this event name? The key has to come from the
    // markets, not the slug: Polymarket slugs CFB schools as "kentst"/"bowlgr" while
    // ESPN writes KENT and BGSU. Building it lazily from the first rows emitted
    // produced keys like "2026-11-14|NU|NU", which pooled unrelated rungs into one
    // outcome and invented edges of 88%.
    const named = new Set<string>();
    for (const m of parts) {
      const q = String(m.question ?? '');
      const sp = q.match(/^spread:\s*(.+?)\s+\(([+-]?\d+(?:\.\d+)?)\)/i);
      const ml = q.match(/^(.+?)\s+vs\.?\s+(.+?)\s*:?\s*moneyline$/i);
      if (sp) {
        const t = canon(teams, sp[1]);
        if (t) named.add(t);
      } else if (ml) {
        for (const raw of [ml[1], ml[2]]) {
          const t = canon(teams, raw);
          if (t) named.add(t);
        }
      }
      if (named.size >= 2) break;
    }
    // Fall back to the slug tokens so an event still contributes rows when ESPN's
    // team list cannot name one school; the key stays stable and self-describing.
    const slugTokens = String(ev.slug)
      .split('-')
      .slice(1, 3)
      .map((t: string) => t.toUpperCase());
    const pair = [...new Set([...named, ...slugTokens])].filter(Boolean).slice(0, 2);
    if (pair.length < 2) continue;

    for (const m of parts) {
      const q = String(m.question ?? '');
      const isSpread = /^spread:\s*/i.test(q);
      const isMl = /moneyline$/i.test(q) && !/\b(1Q|2Q|3Q|4Q|1H|2H|quarter|half)\b/i.test(q);
      if (!isSpread && !isMl) continue;
      if (m.closed) continue;
      let side: string | null = null;
      let line: number | null = null;
      if (isSpread) {
        const mm = q.match(/^spread:\s*(.+?)\s+\(([+-]?\d+(?:\.\d+)?)\)/i);
        if (!mm) continue;
        side = canon(teams, mm[1]);
        line = Number(mm[2]);
      } else {
        const mm = q.match(/^(.+?)\s+vs\.?\s+(.+?)\s*:?\s*moneyline$/i);
        if (!mm) continue;
        side = canon(teams, mm[1]);
        line = null;
      }
      if (!side) continue;
      const ask = num(m.bestAsk);
      const bid = num(m.bestBid);
      if (ask === null && bid === null) continue;
      rows.push({
        venue: 'polymarket',
        family: isSpread ? 'SPREAD' : 'ML',
        event: gameKey(date, pair[0], pair[1]),
        side,
        line,
        claim: isSpread ? 'margin' : 'cover',
        bid,
        ask: ask ?? bid,
        bidSize: null,
        askSize: null,
        live: false,
        seenAt: now,
      });
    }
  }
  health.push({ venue: 'polymarket', ok: rows.length > 0, rows: rows.length, note: `${games.length} games` });
  return rows;
}

/** Kalshi exposes yes_bid/yes_ask per market. Two things have to be derived
 *  rather than read: the game date lives in the ticker (`KXNFLSPREAD-26NOV09…`),
 *  not in `open_time` (which is when the book opened, often days earlier), and
 *  `yes_sub_title` carries a full team name that needs canonicalizing. */
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function tickerDate(ticker: string): string | null {
  const m = ticker.match(/-(\d{2})([A-Z]{3})(\d{2})/);
  if (!m) return null;
  const mon = MON.indexOf(m[2]);
  if (mon < 0) return null;
  return `20${m[1]}-${String(mon + 1).padStart(2, '0')}-${m[3]}`;
}

/** Kalshi 429s hard when polled. One retry with backoff is enough to survive a
 *  cold scan; beyond that the board just reports the venue as down. */
async function kalshiGet(url: string): Promise<any | null> {
  // Kalshi's public read is rate-limited hard (429) and it is the only feed that
  // punishes a burst. Back off progressively rather than returning an empty venue.
  const waits = [0, 350, 800, 1600];
  for (const wait of waits) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    const res = await fetch(url, { headers: UA }).catch(() => null);
    if (res && res.ok) return res.json().catch(() => null);
    if (!res || res.status !== 429) return null;
  }
  return null;
}

async function kalshiRows(
  league: League,
  now: number,
  health: Health[],
  teams: Map<string, string>,
): Promise<Row[]> {
  const rows: Row[] = [];
  let note: string | undefined;
  const cutoff = new Date(Date.now() - 36 * 3600_000).toISOString().slice(0, 10);

  for (const series of league.kalshi) {
    const data = await kalshiGet(`${KALSHI}/markets?series_ticker=${series}&status=open&limit=200`);
    if (!data) {
      note = note ?? 'unavailable';
      continue;
    }
    for (const m of data?.markets || []) {
      const ticker = String(m.ticker ?? '');
      const date = tickerDate(ticker);
      if (!date || date < cutoff) continue;

      // The middle ticker field is the date-stamped matchup: 26NOV09PHIGB -> PHI, GB.
      const matchup = (ticker.split('-')[1] || '').replace(/^\d{2}[A-Z]{3}\d{2}/, '');
      if (matchup.length < 6) continue;
      const away = canon(teams, matchup.slice(0, 3));
      const home = canon(teams, matchup.slice(3, 6));
      if (!away || !home) continue;

      const sub = String(m.yes_sub_title ?? '').replace(/\s*[+-]?\d+(\.\d+)?\s*$/, '').trim();
      const side = series.includes('TOTAL') ? sub || 'OVER' : canon(teams, sub);
      if (!side) continue;

      rows.push({
        venue: 'kalshi',
        family: series.includes('SPREAD') ? 'SPREAD' : series.includes('TOTAL') ? 'TOTAL' : 'ML',
        event: gameKey(date, away, home),
        side,
        line: num(m.floor_strike),
        claim: series.includes('SPREAD') ? 'margin' : 'cover',
        bid: num(m.yes_bid_dollars),
        ask: num(m.yes_ask_dollars),
        bidSize: num(m.yes_bid_size_fp),
        askSize: num(m.yes_ask_size_fp),
        live: false,
        seenAt: now,
      });
    }
  }
  health.push({ venue: 'kalshi', ok: rows.length > 0, rows: rows.length, note });
  return rows;
}

/** ProphetX needs a minted token. The key stays on the server. */
async function prophetxToken(): Promise<string | null> {
  const key = process.env.PROPHETX_API_KEY;
  const secret = process.env.PROPHETX_SECRET_KEY;
  if (!key || !secret) return null;
  const res = await fetch(`${PX}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_key: key, secret_key: secret }),
  }).catch(() => null);
  if (!res || !res.ok) return null;
  const data: any = await res.json().catch(() => null);
  return data?.data?.access_token ?? null;
}

/** ProphetX publishes a resting OFFER LADDER per selection, quoted in American
 *  odds. The price is what YOU pay to take that selection, so the best
 *  (lowest implied probability) offer in a selection's group is its ask. The
 *  group for the other team in the same strike gives the complementary ask, and
 *  laying this side is only worth 1 - that. Nothing here is a midpoint; if a
 *  rung has no offer it produces no row.
 *
 *  Only the full-game `spread` / `money` sub_types are read: the API also
 *  returns first-half, second-half and quarter spreads under the same event. */
async function prophetxRows(
  league: League,
  now: number,
  health: Health[],
  teams: Map<string, string>,
): Promise<Row[]> {
  const token = await prophetxToken();
  if (!token) {
    health.push({ venue: 'prophetx', ok: false, rows: 0, note: 'no PROPHETX_API_KEY/SECRET_KEY' });
    return [];
  }
  const hdr = { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': UA['user-agent'] };
  const pxGet = async (path: string): Promise<any | null> => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(`${PX}${path}`, { headers: hdr }).catch(() => null);
      if (res && res.ok) return res.json().catch(() => null);
      if (res && res.status === 429 && attempt < 2) {
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
        continue;
      }
      return null;
    }
    return null;
  };

  const evj = await pxGet(`/mm/get_sport_events?tournament_id=${league.pxTournament}`);
  const events: any[] = evj?.data?.sport_events ?? [];
  if (!events.length) {
    health.push({ venue: 'prophetx', ok: false, rows: 0, note: 'no events' });
    return [];
  }

  const rows: Row[] = [];
  let settled = 0;
  const upcoming = events.filter((e) => e?.status === 'not_started').slice(0, 24);
  for (const e of upcoming) {
    const comps: any[] = Array.isArray(e?.competitors) ? e.competitors : [];
    const home = comps.find((c) => c?.side === 'home');
    const away = comps.find((c) => c?.side === 'away');
    if (!home || !away) continue;
    const homeAbbr = canon(teams, String(home.display_name ?? ''));
    const awayAbbr = canon(teams, String(away.display_name ?? ''));
    if (!homeAbbr || !awayAbbr) continue;
    // `scheduled` is an ISO string here, not epoch ms; Number() would give NaN.
    const start = Date.parse(String(e?.scheduled ?? '')) || 0;
    if (!start) continue;
    const date = new Date(start).toISOString().slice(0, 10);
    const live = start < Date.now();

    for (const [mt, want] of [['spread', 'spread'], ['money', 'money']] as const) {
      const mkj = await pxGet(`/v4/mm/get_markets?event_id=${e.event_id}&market_types=${mt}`);
      for (const m of mkj?.data?.markets ?? []) {
        if (String(m?.sub_type ?? '') !== want) continue;
        for (const st of m?.market_strikes ?? []) {
          if (String(st?.status ?? 'active') !== 'active') continue;
          const groups: any[][] = Array.isArray(st?.selections) ? st.selections : [];
          if (groups.length !== 2) continue;
          // Best offer per group -> { prob, qty, team, line }.
          const best = groups.map((g) => {
            let pick: { prob: number; qty: number; name: string; strike: number | null } | null = null;
            for (const o of g ?? []) {
              const am = num(o?.price);
              if (am === null || !am) continue;
              const prob = am > 0 ? 100 / (am + 100) : -am / (-am + 100);
              const qty = num(o?.quantity) ?? 0;
              if (!pick || prob < pick.prob || (prob === pick.prob && qty > pick.qty)) {
                pick = { prob, qty, name: String(o?.display_name ?? o?.name ?? ''), strike: num(o?.strike) };
              }
            }
            return pick;
          });
          if (!best[0] || !best[1]) continue;
          for (let i = 0; i < 2; i++) {
            const own = best[i]!;
            const trimmed = own.name.replace(/\s*[+-]?\d+(\.\d+)?\s*$/, '').trim();
            const side = want === 'money' ? canon(teams, trimmed) : canon(teams, trimmed);
            if (!side) continue;
            // Each order carries its own SIGNED strike, so the away team gets +6.5
            // from the same ladder rung the home team prices at -6.5.
            // Each group in a ProphetX ladder is one LADDER RUNG, not one side: the
            // two groups are ">5.5" and ">6.5", so group[1] is not the complement of
            // group[0] and 1 - other.prob is meaningless. The complement has to come
            // from the opposite-signed rung of the same market.
            const signed = want === 'money' ? null : signedLine(own.name, num(own.strike) ?? num(st?.strike), 'SPREAD');
            rows.push({
              venue: 'prophetx',
              family: want === 'money' ? 'ML' : 'SPREAD',
              event: gameKey(date, awayAbbr, homeAbbr),
              side,
              line: signed,
              // A bid is only real when something can be laid on the OTHER side,
              // and the other group here is a neighbouring rung. Leave bid null
              // rather than synthesising a lay against an unrelated strike.
              bid: null,
              ask: own.prob,
              bidSize: null,
              askSize: own.qty || null,
              live,
              seenAt: now,
            });
          }
        }
      }
    }
    settled++;
  }

  health.push({
    venue: 'prophetx',
    ok: rows.length > 0,
    rows: rows.length,
    note: settled ? `${settled}/${upcoming.length} events` : 'no priced markets',
  });
  return rows;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const key = (url.searchParams.get('league') || 'nfl').toLowerCase();
  const league = LEAGUES[key];
  if (!league) {
    return Response.json({ error: `unknown league: ${key}`, known: Object.keys(LEAGUES) }, { status: 400 });
  }

  const now = Date.now() / 1000;
  const health: Health[] = [];

  // One canonical team map for every venue, so "Los Angeles Chargers", "Chargers"
  // and "LAC" all become LAC before any price is compared.
  const teams = await leagueTeams(league).catch(() => new Map<string, string>());

  const [novig, poly, kalshi, px] = await Promise.all([
    novigRows(league, now, health, teams).catch(() => [] as Row[]),
    polymarketRows(league, now, health, teams).catch(() => [] as Row[]),
    kalshiRows(league, now, health, teams).catch(() => [] as Row[]),
    prophetxRows(league, now, health, teams).catch(() => [] as Row[]),
  ]);

  const rows: Row[] = [...novig, ...poly, ...kalshi, ...px];
  const arbs = findArbs(rows, now, DEFAULT_OPTS);
  const quotes = quoteSheet(rows, now, 0.025);
  const values = valueBets(rows, now, 0.02);
  // Margin-band claims are quarantined from the arb scan but are still two venues
  // pricing the SAME claim (Polymarket ladder vs Kalshi ladder), so they belong here.
  const comparisons = compare(rows, now, 180, true).slice(0, 60);

  if (url.searchParams.get('raw')) {
    return Response.json({ league: key, now, rows, health, comparisons });
  }

  return Response.json(
    {
      league: key,
      now,
      health,
      counts: {
        rows: rows.length,
        outcomes: new Set(rows.map((r) => `${r.event}|${r.family}|${r.side}`)).size,
        crossVenue: [...new Set(rows.map((r) => r.event))].filter(
          (e) => new Set(rows.filter((r) => r.event === e).map((r) => r.venue)).size > 1,
        ).length,
      },
      arbs,
      values,
      quotes,
      comparisons,
      note:
        arbs.length === 0
          ? 'No locked cross-venue trade at visible size. Two exchanges rarely disagree after fees; that is the expected result, not a failure.'
          : `${arbs.length} locked trade(s). Verify both legs are still live before acting: prices move between this snapshot and execution.`,
    },
    { headers: { 'cache-control': 'public, max-age=15, s-maxage=15' } },
  );
}
