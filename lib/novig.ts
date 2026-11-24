import { CfbGame, espnFetch } from './cfb';

// Novig is a peer-to-peer sports prediction market: every contract trades between 0 and 1,
// and the traded price IS the market's implied probability. There is no vig to strip and no
// spread quoted in points — the book is the probability.
//
// The unsigned catalog at /v3/public/catalog/* is public, so the board can read live quotes
// without a key or an account. ESPN remains the score/stats source; Novig supplies prices.

export interface NovigQuoteSide {
  name: string;
  price: number;
  qty: number;
}

export interface NovigPrice {
  marketId: string;
  marketType: string;
  strike?: number;
  description: string;
  outcomes: NovigQuoteSide[];
  volume: number;
  openInterest: number;
}

export interface NovigEvent {
  eventId: string;
  description: string;
  startsTs: number;
  markets: NovigPrice[];
}

export interface NovigBook {
  marketId: string;
  level: 'paper' | 'production';
  events: NovigEvent[];
  fetchedAt: number;
}

const HOST_LABEL = (): 'paper' | 'production' =>
  (typeof process !== 'undefined' && process.env?.NOVIG_HOST?.includes('api.novig.com')) ? 'production' : 'paper';

/**
 * Novig writes futures and some parlay-ish markets with an empty description. The team names
 * live in the outcome labels instead ("Ohio State -14.5" / "PSU"), so derive a label from
 * them rather than dropping the event off the board.
 */
function teamLabels(markets: NovigPrice[]): string[] {
  const fromSpread = markets
    .filter((m) => m.marketType === 'SPREAD' && m.outcomes.length === 2)
    .map((m) => m.outcomes.map((o) => o.name.replace(/\s*[+-]?\d+(\.\d+)?\s*$/, '').trim()));
  const pairs = fromSpread.filter((p) => p[0] && p[1]);
  if (!pairs.length) return [];
  // A spread's two sides are the two teams; `description` on the market is the home side.
  return [pairs[0][0], pairs[0][1]];
}

/** Fill missing event descriptions from ESPN, matching on the outcome team labels. */
async function backfillDescriptions(book: NovigBook, season: number): Promise<void> {
  const missing = book.events.filter((e) => !e.description.includes('@'));
  if (!missing.length) return;
  const teams = new Map<string, { home: string; away: string }>();
  for (const ev of missing) {
    const labels = teamLabels(ev.markets);
    if (labels.length !== 2) continue;
    for (const label of labels) teams.set(teamKey(label), { home: '', away: '' });
  }
  if (!teams.size) return;
  try {
    const data = await espnFetch(`scoreboard?dates=${season}&limit=1000`);
    const events: any[] = data?.events || [];
    for (const e of events) {
      const comp = e.competitions?.[0];
      const home = comp?.competitors?.find((c: any) => c.homeAway === 'home')?.team;
      const away = comp?.competitors?.find((c: any) => c.homeAway === 'away')?.team;
      if (!home || !away) continue;
      teams.set(teamKey(home.abbreviation || home.shortDisplayName || home.name), { home: home.abbreviation, away: away.abbreviation });
      teams.set(teamKey(away.abbreviation || away.shortDisplayName || away.name), { home: home.abbreviation, away: away.abbreviation });
    }
    for (const ev of missing) {
      const labels = teamLabels(ev.markets);
      const pair = labels.map((l) => teams.get(teamKey(l))).find((t) => t && t.home && t.away);
      if (pair) ev.description = `${pair.away} @ ${pair.home}`;
    }
  } catch {
    // ESPN unavailable: the event stays unlabelled, which only costs the team-match row.
  }
}

async function novigFetch(path: string): Promise<any> {
  const res = await fetch(`/api/novig?path=${encodeURIComponent(path)}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Novig ${res.status} on ${path}`);
  return res.json();
}

function num(v: any): number | undefined {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : undefined;
}

function priceMarket(m: any): NovigPrice | null {
  const outcomes: NovigQuoteSide[] = (m.outcomes || [])
    .map((o: any) => ({
      name: String(o.name ?? ''),
      price: num(o.bid?.price) ?? num(o.last) ?? NaN,
      qty: number0(o.bid?.qty),
    }))
    .filter((o: NovigQuoteSide) => Number.isFinite(o.price));
  if (outcomes.length < 2) return null;
  return {
    marketId: String(m.marketId),
    marketType: String(m.marketType ?? ''),
    strike: num(m.strike),
    description: String(m.description ?? ''),
    outcomes,
    volume: number0(m.volume),
    openInterest: number0(m.openInterest),
  };
}

function number0(v: any): number {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

/**
 * Pull every open market for a league and group it by event. Novig pages at 500 rows by
 * default and returns a `next` cursor; a full FBS slate is several pages, so keep reading
 * until `next` is absent or the page budget runs out.
 */
export async function getNovigLeague(league = 'NCAAF', maxPages = 6): Promise<NovigBook> {
  const events = new Map<string, NovigEvent>();
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const query: string = `markets?league=${encodeURIComponent(league)}&limit=2000${cursor ? `&cursor=${cursor}` : ''}`;
    const data = await novigFetch(query);
    const items: any[] = data?.items || [];
    for (const raw of items) {
      const priced = priceMarket(raw);
      if (!priced) continue;
      const id = String(raw.eventId);
      const existing = events.get(id);
      if (existing) {
        if (!existing.description && raw.description) existing.description = String(raw.description);
        existing.markets.push(priced);
      } else {
        events.set(id, {
          eventId: id,
          description: String(raw.description ?? ''),
          startsTs: number0(raw.startsTs),
          markets: [priced],
        });
      }
    }
    const next = data?.next;
    if (!next || next === cursor) break;
    cursor = String(next);
  }
  const book: NovigBook = {
    marketId: league,
    level: HOST_LABEL(),
    events: [...events.values()],
    fetchedAt: Date.now(),
  };
  if (typeof window !== 'undefined') await backfillDescriptions(book, new Date().getFullYear());
  return book;
}

// ---------------------------------------------------------------- matching

const ALIAS: Record<string, string> = {
  OHIOST: 'OHIOST', OHIOSTATE: 'OHIOST', OHST: 'OHIOST',
  MICHIGAN: 'MICH', MICH: 'MICH', MICHST: 'MICHST', MICHIGANST: 'MICHST',
  PENNSTATE: 'PSU', PSU: 'PSU', PENNST: 'PSU',
  NOTREDAME: 'ND', ND: 'ND', NOTREDAM: 'ND',
  ALABAMA: 'ALA', ALA: 'ALA', AUBURN: 'AUB', AUB: 'AUB',
  LSU: 'LSU', LOUISIANAST: 'LSU',
  GEORGIA: 'UGA', UGA: 'UGA', GA: 'UGA',
  FLORIDA: 'FLA', FLA: 'FLA', UF: 'FLA', FLORIDAST: 'FSU', FSU: 'FSU',
  TEXAS: 'TEX', TEX: 'TEX', TEXASAM: 'TAMU', TAMU: 'TAMU',
  OKLAHOMA: 'OU', OU: 'OU', OKLA: 'OU', OKLAHOMAST: 'OKST', OKST: 'OKST',
  OREGON: 'ORE', ORE: 'ORE', USC: 'USC', UCLA: 'UCLA',
  WISCONSIN: 'WIS', WIS: 'WIS', IOWA: 'IOWA',
  TENNESSEE: 'TENN', TENN: 'TENN', CLEMSON: 'CLEM', CLEM: 'CLEM',
  WASHINGTON: 'WASH', WASH: 'WASH', WASHST: 'WSU', WSU: 'WSU',
  WESTVIRGINIA: 'WVU', WVU: 'WVU', LOUISVILLE: 'LOU', LOU: 'LOU',
  ARKANSAS: 'ARK', ARK: 'ARK', MISSISSIPPI: 'MISS', MISS: 'MISS',
  OLEMISS: 'MISS', MISSISSIPPIST: 'MSST', MSST: 'MSST', MISSST: 'MSST',
  NEBRASKA: 'NEB', NEB: 'NEB', NORTHCAROLINA: 'UNC', UNC: 'UNC',
  MIAMI: 'MIA', MIA: 'MIA', MIAMIFL: 'MIA', MIAMIOH: 'M-OH',
  CINCINNATI: 'CIN', CIN: 'CIN', HOUSTON: 'HOU', HOU: 'HOU',
  BYU: 'BYU', UTAH: 'UTAH', UTAHST: 'USU', USU: 'USU',
  BOISEST: 'BSU', BSU: 'BSU', BOISESTATE: 'BSU',
  COLORADOST: 'CSU', CSU: 'CSU', COLORADOSTATE: 'CSU', COLORADO: 'COLO', COLO: 'COLO',
  ARIZONA: 'ARIZ', ARIZ: 'ARIZ', ARIZONAST: 'ASU', ASU: 'ASU',
  TCU: 'TCU', BAYLOR: 'BAY', BAY: 'BAY', TEXASTECH: 'TTU', TTU: 'TTU',
  KENTUCKY: 'UK', UK: 'UK', VANDERBILT: 'VAN', VAN: 'VAN',
  PURDUE: 'PUR', PUR: 'PUR', INDIANA: 'IND', IND: 'IND',
  ILLINOIS: 'ILL', ILL: 'ILL', NORTHWESTERN: 'NU', NU: 'NU',
  MINNESOTA: 'MINN', MINN: 'MINN', RUTGERS: 'RUTG', RUTG: 'RUTG',
  MARYLAND: 'MD', MD: 'MD', SYRACUSE: 'SYR', SYR: 'SYR',
  BOSTONCOLLEGE: 'BC', BC: 'BC', PITTSBURGH: 'PITT', PITT: 'PITT',
  VIRGINIATECH: 'VT', VT: 'VT', VIRGINIA: 'UVA', UVA: 'UVA',
  DUKE: 'DUKE', WAKE: 'WAKE', WAKEFOREST: 'WAKE',
};

export function teamKey(value: string): string {
  const cleaned = value.toUpperCase().replace(/[^A-Z]/g, '');
  return ALIAS[cleaned] || cleaned;
}

function teamKeys(game: CfbGame, side: 'home' | 'away'): Set<string> {
  const t = game[side];
  return new Set([teamKey(t.abr), teamKey(t.shortName), teamKey(t.name)]);
}

/** Match an ESPN game to a Novig event by its two team names, order-independent. */
export function matchNovigEvent(game: CfbGame, book: NovigBook): NovigEvent | undefined {
  const keys = [teamKeys(game, 'home'), teamKeys(game, 'away')];
  const targetSize = keys[0].size + keys[1].size;
  let best: { ev: NovigEvent; score: number } | undefined;
  for (const ev of book.events) {
    const parts = ev.description.split(/\s*@\s*/);
    if (parts.length !== 2) continue;
    const names = [teamKey(parts[0]), teamKey(parts[1])];
    const homeHit = names.some((n) => keys[0].has(n));
    const awayHit = names.some((n) => keys[1].has(n));
    if (homeHit && awayHit) {
      if (!best || ev.markets.length > best.score) best = { ev, score: ev.markets.length };
    }
  }
  void targetSize;
  return best?.ev;
}

// ---------------------------------------------------------------- formatting

export const probToAmerican = (p?: number): string => {
  if (p == null || !Number.isFinite(p) || p <= 0 || p >= 1) return 'NL';
  const odds = p > 0.5 ? -(p / (1 - p)) * 100 : ((1 - p) / p) * 100;
  const rounded = Math.round(odds);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
};

export const probToPercent = (p?: number): string =>
  p != null && Number.isFinite(p) ? `${(p * 100).toFixed(1)}%` : '—';

/** The market's fair mid: mean of the two sides' prices, in probability terms. */
export function fairPrice(price: NovigPrice): number | undefined {
  const prices = price.outcomes.map((o) => o.price).filter(Number.isFinite);
  if (prices.length !== 2) return undefined;
  const total = prices[0] + prices[1];
  return total > 0 ? prices[0] / total : undefined;
}
