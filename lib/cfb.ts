import { WeekData, PickArchiveItem, GameSummary, BetResult, League } from '../types';
import bundled2006 from '../src/assets/cfb/2006.json';

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football';

// The CFB season that is being played right now. ESPN labels a season by its kickoff
// year, so anything from August onward belongs to the current calendar year.
export function currentSeason(now: Date = new Date()): number {
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

export const LIVE_SEASON = currentSeason();
export const ARCHIVE_SEASON = 2006;
const SEASON = LIVE_SEASON;

export const cfbSeasonLabel = (season: number = SEASON) => `${season} CFB`;

// ESPN sends no CORS headers, so the browser cannot read the scoreboard directly.
// `/api/cfb` is a same-origin proxy (Vercel function in prod, Vite middleware in dev);
// the direct and public-proxy attempts stay as fallbacks for static hosting.
const PROXIES = [
  (url: string) => `/api/cfb?path=${encodeURIComponent(url.replace(`${ESPN}/`, ''))}`,
  (url: string) => url,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

export async function espnFetch(path: string): Promise<any> {
  let lastErr: any = null;
  for (const wrap of PROXIES) {
    try {
      const res = await fetch(wrap(`${ESPN}/${path}`), { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`ESPN ${res.status} on ${path}`);
      const data = await res.json();
      if (data && (data.error || data.code)) throw new Error(`proxy error on ${path}: ${data.message || data.error}`);
      return data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error(`ESPN fetch failed: ${path}`);
}

const ARCHIVE_KEY = `cfb_${ARCHIVE_SEASON}_archive`;
const cacheKey = (season: number) => `cfb_${season}_cache_v2`;
const LIVE_KEY = `cfb_${LIVE_SEASON}_live_v1`;

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded — caches are best-effort
  }
}

const WEEK_RE = /^(Week|Regular Season -|Postseason -)\s*/i;

export function weekLabel(event: any): string {
  const type = event.season?.type ?? event.season?.slug;
  const isPost = event.season?.slug === 'post-season' || type === 3;
  const week = event.week?.number ?? 1;
  if (isPost) {
    const name = event.week?.text && !WEEK_RE.test(event.week.text) ? event.week.text : null;
    return name ?? `Postseason - Bowl ${week}`;
  }
  return `Week ${week}`;
}

export interface CfbTeam {
  id: string;
  name: string;
  shortName: string;
  abr: string;
  logo: string;
  score: string;
  winner: boolean;
  linescores: number[];
  homeAway: 'home' | 'away';
}

export interface CfbGame {
  id: string;
  date: string;
  kickoff: string;
  status: string;
  completed: boolean;
  week: string;
  venue: string;
  neutralSite: boolean;
  away: CfbTeam;
  home: CfbTeam;
  line?: CfbLine;
}

// Novig is a peer-to-peer exchange, so a "line" is an order book, not a bookmaker quote.
// Prices are probabilities in [0,1]; `quote` is the implied American price after the fee.
export interface CfbQuote {
  price: number;
  best?: { price: number; qty: number };
  last?: number;
}

export interface CfbLine {
  provider: string;
  /** Spread as the home team's handicap, e.g. -24.5 */
  spread?: number;
  total?: number;
  marketIds?: { spread?: string; total?: string; money?: string };
  home?: { spread?: CfbQuote; money?: CfbQuote; teamTotal?: CfbQuote };
  away?: { spread?: CfbQuote; money?: CfbQuote; teamTotal?: CfbQuote };
  over?: CfbQuote;
  under?: CfbQuote;
  /** fee coefficient Novig charges on a taker fill */
  feeCoef?: number;
}

export interface CfbPlay {
  id: string;
  period: number;
  clock: string;
  text: string;
  scoring: boolean;
  awayScore: number;
  homeScore: number;
  teamId?: string;
}

export interface CfbDetail {
  game: CfbGame;
  drives: any[];
  plays: CfbPlay[];
  scoringPlays: CfbPlay[];
  teamStats: { team: string; stats: Record<string, string> }[];
  hasPlayByPlay: boolean;
}

const LOGO = (id: string) => `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`;

function teamFromCompetitor(c: any): CfbTeam {
  const t = c.team || {};
  return {
    id: String(t.id ?? ''),
    name: t.displayName || t.shortDisplayName || t.name || 'TBD',
    shortName: t.shortDisplayName || t.name || t.abbreviation || 'TBD',
    abr: t.abbreviation || (t.shortDisplayName || '').slice(0, 4).toUpperCase() || 'TBD',
    logo: t.logo || LOGO(String(t.id ?? '0')),
    score: c.score?.displayValue ?? c.score ?? '0',
    winner: !!c.winner,
    linescores: (c.linescores || []).map((l: any) => (l.value != null ? Number(l.value) : parseInt(l.displayValue || '0', 10) || 0)),
    homeAway: c.homeAway === 'home' ? 'home' : 'away',
  };
}

function playFromRaw(p: any): CfbPlay {
  return {
    id: String(p.id ?? `${p.sequenceNumber ?? Math.random()}`),
    period: p.period?.number ?? 0,
    clock: p.clock?.displayValue || '',
    text: p.text || p.description || '',
    scoring: !!(p.scoringPlay || p.scoring),
    awayScore: p.awayScore ?? 0,
    homeScore: p.homeScore ?? 0,
    teamId: p.team?.id ? String(p.team.id) : undefined,
  };
}

export function gameFromEvent(event: any): CfbGame {
  const comp = event.competitions?.[0] || {};
  const comps = comp.competitors || [];
  const home = comps.find((c: any) => c.homeAway === 'home');
  const away = comps.find((c: any) => c.homeAway === 'away');
  const odds = (comp.odds || [])[0] || (event.odds || [])[0];
  const statusType = event.status?.type || comp.status?.type || {};
  const dateIso = event.date || comp.date || '';
  return {
    id: String(event.id || comp.id),
    date: dateIso.slice(0, 10),
    kickoff: dateIso,
    status: statusType.detail || statusType.shortDetail || statusType.description || 'Scheduled',
    completed: !!statusType.completed,
    week: weekLabel(event),
    venue: comp.venue?.fullName || '',
    neutralSite: !!comp.neutralSite,
    away: away ? teamFromCompetitor(away) : teamFromCompetitor({}),
    home: home ? teamFromCompetitor(home) : teamFromCompetitor({}),
    line: odds
      ? {
          spread: odds.spread,
          total: odds.overUnder,
          provider: odds.provider?.name,
        }
      : undefined,
  };
}

// --- Novig (sports prediction market) -------------------------------------------------
//
// Novig publishes its catalog unsigned at /v3/public/catalog/*, but sends no CORS headers,
// so `/api/novig` proxies it (Vercel function in prod, Vite middleware in dev).
// The catalog is prices only: probabilities and resting size, no scores. Scores stay ESPN.

export const NOVIG_PAPER = 'https://api.paper.novig.com';
const NOVIG_PUBLIC = (path: string) => `/api/novig?path=${encodeURIComponent(path)}`;

export interface NovigMarket {
  marketId: string;
  description: string;
  eventId: string;
  marketType: string;
  strike: string;
  status: string;
  startsTs: number;
  outcomes: {
    outcomeId: string;
    name: string;
    status: string;
    last?: string;
    bid?: { price: string; qty: number };
    ask?: { price: string; qty: number };
  }[];
  volume?: number;
  openInterest?: number;
  fee?: { coefficient?: string };
}

async function novigFetch(path: string): Promise<any> {
  const res = await fetch(NOVIG_PUBLIC(path), { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Novig ${res.status} on ${path}`);
  return res.json();
}

const PAGES = 6;

/** All NCAAF markets Novig lists, paged through the cursor. */
export async function fetchNovigCfbMarkets(): Promise<{ markets: NovigMarket[]; events: any[] }> {
  const [events, first] = await Promise.all([
    novigFetch('v3/public/catalog/events?league=NCAAF'),
    novigFetch('v3/public/catalog/markets?league=NCAAF&limit=2000'),
  ]);
  const markets: NovigMarket[] = [...(first?.items || [])];
  let cursor = first?.next;
  for (let page = 1; page < PAGES && cursor; page++) {
    const next = await novigFetch(`v3/public/catalog/markets?league=NCAAF&limit=2000&cursor=${cursor}`);
    const items: NovigMarket[] = next?.items || [];
    if (!items.length) break;
    markets.push(...items);
    cursor = next?.next;
  }
  // Pages can repeat a market at a boundary; keep the first copy.
  const seen = new Set<string>();
  const dedup = markets.filter((m) => (seen.has(m.marketId) ? false : (seen.add(m.marketId), true)));
  return { markets: dedup, events: events?.items || [] };
}

const num = (v: any): number | undefined => (v == null || v === '' ? undefined : Number(v));

function quoteOf(o: any): CfbQuote | undefined {
  if (!o) return undefined;
  const best = o.bid ? { price: Number(o.bid.price), qty: Number(o.bid.qty) } : o.ask ? { price: Number(o.ask.price), qty: Number(o.ask.qty) } : undefined;
  const price = best?.price ?? num(o.last);
  if (price == null || Number.isNaN(price)) return undefined;
  return { price, best, last: num(o.last) };
}

const normTeam = (s: string) =>
  (s || '').toUpperCase().replace(/[^A-Z ]/g, '').replace(/\s+/g, ' ').trim();

/** Match a Novig team label ("ILL", "PENN ST") against an ESPN team ("Illinois", "Penn State"). */
export function teamMatches(label: string, team: CfbTeam): boolean {
  const L = normTeam(label);
  if (!L) return false;
  const abr = normTeam(team.abr);
  const short = normTeam(team.shortName);
  const name = normTeam(team.name);
  if (L === abr || L === short) return true;
  if (L.length >= 3 && (name.startsWith(L) || short.startsWith(L))) return true;
  if (name.split(' ').some((w) => w.startsWith(L) && L.length >= 3)) return true;
  if (abr.length >= 3 && (L.startsWith(abr) || abr.startsWith(L))) return true;
  return false;
}

/**
 * Merge Novig prices onto ESPN games. Novig's event descriptions are "Away @ Home", and
 * its spread/money descriptions name a side, which is how each market gets an orientation.
 */
export function attachNovigLines(games: CfbGame[], markets: NovigMarket[]): CfbGame[] {
  const byEvent = new Map<string, NovigMarket[]>();
  for (const m of markets) {
    if (!byEvent.has(m.eventId)) byEvent.set(m.eventId, []);
    byEvent.get(m.eventId)!.push(m);
  }
  // Novig events are matched to ESPN games by team pair, not by id: the two systems share
  // no identifiers.
  const out = games.map((g) => ({ ...g }));
  const used = new Set<string>();

  for (const g of out) {
    let hit: { id: string; list: NovigMarket[] } | null = null;
    for (const [eventId, list] of byEvent) {
      if (used.has(eventId)) continue;
      const desc = list.find((m) => m.marketType === 'SPREAD')?.description || '';
      const across = /^(.+?)\s+(-?\+?\d+(?:\.\d+)?)$/.exec(desc.trim());
      if (!across) continue;
      const label = across[1];
      if (teamMatches(label, g.away) || teamMatches(label, g.home)) {
        hit = { id: eventId, list };
        break;
      }
    }
    if (!hit) continue;
    used.add(hit.id);
    const line = novigLineFor(g, hit.list);
    if (line) g.line = line;
  }
  return out;
}

function novigLineFor(g: CfbGame, list: NovigMarket[]): CfbLine | undefined {
  const spreadM = list.find((m) => m.marketType === 'SPREAD');
  const totalM = list.find((m) => m.marketType === 'TOTAL');
  const moneyM = list.find((m) => m.marketType === 'MONEY');
  const line: CfbLine = { provider: 'Novig', marketIds: {} };
  if (!spreadM && !totalM && !moneyM) return undefined;

  const sidesOf = (m: NovigMarket) =>
    m.outcomes.map((o) => {
      const label = o.name.replace(/\s*[+-]?\d+(\.\d+)?$/, '').trim();
      return { o, label };
    });

  if (spreadM) {
    line.marketIds!.spread = spreadM.marketId;
    line.feeCoef = num(spreadM.fee?.coefficient);
    const legs = sidesOf(spreadM).map(({ o, label }) => ({ o, label, q: quoteOf(o) }));
    const homeLeg = legs.find((l) => teamMatches(l.label, g.home)) || (legs.length === 2 && teamMatches(legs[1].label, g.home) ? legs[1] : undefined);
    const awayLeg = legs.find((l) => teamMatches(l.label, g.away)) || (legs.length === 2 && legs[0] !== homeLeg ? legs[0] : undefined);
    if (homeLeg?.q) line.home = { ...line.home, spread: homeLeg.q };
    if (awayLeg?.q) line.away = { ...line.away, spread: awayLeg.q };
    line.spread = num(spreadM.strike);
    if (line.spread == null && homeLeg) {
      const m = /([+-]\d+(?:\.\d+)?)/.exec(homeLeg.o.name);
      if (m) line.spread = Number(m[1]);
    }
  }

  if (totalM) {
    line.marketIds!.total = totalM.marketId;
    line.total = num(totalM.strike);
    for (const o of totalM.outcomes) {
      const over = /^over/i.test(o.name.trim());
      const q = quoteOf(o);
      if (!q) continue;
      if (over) line.over = q;
      else line.under = q;
    }
  }

  if (moneyM) {
    line.marketIds!.money = moneyM.marketId;
    line.feeCoef = line.feeCoef ?? num(moneyM.fee?.coefficient);
    for (const o of moneyM.outcomes) {
      const q = quoteOf(o);
      if (!q) continue;
      if (teamMatches(o.name, g.home)) line.home = { ...line.home, money: q };
      else if (teamMatches(o.name, g.away)) line.away = { ...line.away, money: q };
    }
  }
  return line;
}

/** Probability (0-1) to American odds, the format the board renders. */
export function probToAmerican(p?: number): number | undefined {
  if (p == null || !(p > 0) || !(p < 1)) return undefined;
  return p >= 0.5 ? Math.round(-100 * (p / (1 - p))) : Math.round(100 * ((1 - p) / p));
}

// Novig prices are the point of the live CFB board, so get them with the scores.
export async function getLiveBoard(force = false): Promise<CfbLiveWeek & { liveMarkets: number }> {
  const week = await getLiveWeek(force);
  if (week.liveMarkets != null) return week as any;
  try {
    const { markets } = await fetchNovigCfbMarkets();
    const games = attachNovigLines(week.games, markets);
    const priced = games.filter((g) => g.line?.home?.money || g.line?.spread != null).length;
    const payload = { ...week, games, liveMarkets: priced };
    writeLS(LIVE_KEY, payload);
    return payload;
  } catch (e) {
    console.warn('[cfb] Novig catalog unavailable, showing scores only', e);
    return { ...week, liveMarkets: 0 };
  }
}

// A full FBS season is ~900 games. Anything much smaller is a partial write from an
// interrupted run, and trusting it would leave the board nearly empty.
const MIN_SEASON_GAMES = 200;

async function loadSeasonScoreboard(season: number): Promise<CfbGame[]> {
  // ESPN only serves the current week for a season still in progress, so a "season" pull
  // for the live year would silently be one week. Route it to the live week instead.
  if (season === LIVE_SEASON) {
    const live = await getLiveWeek();
    return live.games;
  }
  const key = cacheKey(season);
  const cached = readLS<{ fetchedAt: number; games: CfbGame[] } | null>(key, null);
  if (
    cached &&
    Date.now() - cached.fetchedAt < 1000 * 60 * 60 * 24 &&
    (cached.games?.length ?? 0) >= MIN_SEASON_GAMES
  ) {
    return cached.games;
  }
  try {
    const data = await espnFetch(`scoreboard?dates=${season}&limit=1000`);
    const games = snapshotFromSeasonPayload(data).filter((g) => inSeasonWindow(g, season));
    if (games.length) {
      writeLS(key, { fetchedAt: Date.now(), games });
      return games;
    }
  } catch (e) {
    console.warn(`CFB ${season} scoreboard fetch failed, using bundled snapshot`, e);
  }
  // A finished season never changes, so the bundled snapshot is the same data. Re-read it
  // fresh instead of trusting a previously cached copy of the bundle.
  const snapshot = savedSeasonSnapshot(season);
  if (snapshot.length) writeLS(key, { fetchedAt: Date.now(), games: snapshot });
  return snapshot;
}

// Last good season payload, used when the browser fetch is blocked (CORS, no proxy, offline)
// so the boards have something real to render instead of an empty board.
export const CFB_SNAPSHOT_KEY = `cfb_${ARCHIVE_SEASON}_snapshot_v1`;

export function savedSeasonSnapshot(season: number = ARCHIVE_SEASON): CfbGame[] {
  if (season !== ARCHIVE_SEASON) {
    const cached = readLS<CfbGame[]>(CFB_SNAPSHOT_KEY, []).filter((g) => g?.id);
    return cached.length >= MIN_SEASON_GAMES ? cached : [];
  }
  const raw: any = bundled2006;
  const arr: CfbGame[] = Array.isArray(raw) ? raw : Array.isArray(raw?.default) ? raw.default : [];
  const fromBundle = arr.filter((g) => g?.id).filter((g) => inSeasonWindow(g, season));
  if (fromBundle.length >= MIN_SEASON_GAMES) return fromBundle;
  const cached = readLS<CfbGame[]>(CFB_SNAPSHOT_KEY, []).filter((g) => g?.id);
  return cached.length >= MIN_SEASON_GAMES ? cached : fromBundle;
}

// The scoreboard call for a calendar year also returns the *previous* season's bowls
// (Jan 2006 is the 2005 BCS), so the replay keeps only games inside the named season.
function inSeasonWindow(g: CfbGame, season: number = SEASON): boolean {
  const start = `${season}-08-01`;
  const end = `${season + 1}-02-15`;
  return !!g.date && g.date >= start && g.date <= end;
}

/**
 * Build a snapshot from an already-fetched ESPN season payload:
 *   ?dates=2006&limit=1000  ->  one scoreboard request for the whole season.
 * Written by `scripts/snapshotCfb.mjs`.
 */
export function snapshotFromSeasonPayload(payload: any, includeUnfinished = false): CfbGame[] {
  const raw = Array.isArray(payload) ? payload : payload?.events || [payload];
  return raw
    .filter((e: any) => e && e.competitions && e.competitions.length)
    .map((e: any) => gameFromEvent(e))
    .filter((g: CfbGame) => !!g.id && (includeUnfinished || g.completed));
}

const seasonPromises = new Map<number, Promise<CfbGame[]>>();

export async function getSeasonGames(season: number = SEASON): Promise<CfbGame[]> {
  const existing = seasonPromises.get(season);
  if (existing) return existing;
  const p = loadSeasonScoreboard(season).catch((e) => {
    seasonPromises.delete(season);
    throw e;
  });
  seasonPromises.set(season, p);
  return p;
}

export interface CfbLiveWeek {
  season: number;
  week: number;
  weekLabel: string;
  games: CfbGame[];
  fetchedAt: number;
  /** how many games the live catalog put a price on */
  liveMarkets?: number;
}

/**
 * The slate that is on the board right now: ESPN's undated scoreboard returns the
 * current week of the current season, including games that have not kicked off yet.
 * Cached for 60s so a live board can poll without hammering the feed.
 */
export async function getLiveWeek(force = false): Promise<CfbLiveWeek> {
  const cached = readLS<CfbLiveWeek | null>(LIVE_KEY, null);
  if (!force && cached && Date.now() - cached.fetchedAt < 60_000 && cached.games?.length) {
    return cached;
  }
  const data = await espnFetch('scoreboard');
  const season = Number(data?.season?.year ?? LIVE_SEASON);
  const week = Number(data?.week?.number ?? 0);
  const games = snapshotFromSeasonPayload(data, true);
  const payload: CfbLiveWeek = {
    season,
    week,
    weekLabel: week ? `Week ${week}` : 'Current Week',
    games,
    fetchedAt: Date.now(),
  };
  if (games.length) writeLS(LIVE_KEY, payload);
  return payload;
}

export async function getWeekGames(season: number = SEASON, weekNumber?: number): Promise<{ games: CfbGame[]; week: string }> {
  const all = await getSeasonGames(season);
  const weeks = availableWeeks(all);
  const target = weekNumber ?? weeks[weeks.length - 1]?.number;
  const chosen = weeks.find((w) => w.number === target) || weeks[0];
  if (!chosen) return { games: [], week: `Week ${target ?? 1}` };
  return { games: all.filter((g) => g.week === chosen.label), week: chosen.label };
}

export interface CfbWeek {
  number: number;
  label: string;
  games: number;
  firstDate: string;
}

export function availableWeeks(games: CfbGame[]): CfbWeek[] {
  const byLabel = new Map<string, CfbGame[]>();
  games.forEach((g) => {
    const arr = byLabel.get(g.week) || [];
    arr.push(g);
    byLabel.set(g.week, arr);
  });
  const weeks: CfbWeek[] = [];
  byLabel.forEach((arr, label) => {
    const m = label.match(/(\d+)\s*$/);
    const number = m ? parseInt(m[1], 10) : 0;
    weeks.push({
      number,
      label,
      games: arr.length,
      firstDate: arr.map((g) => g.date).sort()[0] || '',
    });
  });
  return weeks.sort((a, b) => (a.firstDate < b.firstDate ? -1 : a.firstDate > b.firstDate ? 1 : a.number - b.number));
}

export async function getGameDetail(eventId: string): Promise<CfbDetail | null> {
  const data = await espnFetch(`summary?event=${eventId}`);
  const headerComp = data.header?.competitions?.[0] || {};
  const eventStub = {
    id: eventId,
    date: headerComp.date,
    status: { type: headerComp.status?.type },
    competitions: [
      {
        ...headerComp,
        odds: headerComp.odds || data.odds || [],
      },
    ],
    season: data.header?.season,
    week: data.header?.week,
  };
  const game = gameFromEvent(eventStub);
  const drives = data.drives?.previous || data.drives?.current || [];
  const flatPlays = Array.isArray(data.plays) && data.plays.length
    ? data.plays
    : drives.flatMap((d: any) => d.plays || []);
  const plays = flatPlays.map(playFromRaw);
  const scoringPlays = (data.scoringPlays || []).map(playFromRaw);
  const teamStats = (data.boxscore?.teams || []).map((t: any) => {
    const stats: Record<string, string> = {};
    (t.statistics || []).forEach((s: any) => {
      stats[s.name] = s.displayValue;
    });
    return { team: t.team?.displayName || t.team?.abbreviation || 'Team', stats };
  });
  return {
    game,
    drives,
    plays,
    scoringPlays,
    teamStats,
    hasPlayByPlay: plays.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Settlement — the page is a historical season replay, so every row is graded.
// ---------------------------------------------------------------------------

export type Settle = { result: BetResult; label: string; edge: string; detail: string };

const moneylineToDecimal = (ml: number) => (ml > 0 ? 1 + ml / 100 : 1 + 100 / Math.abs(ml));

export const priceToImplied = (price: number) => (price > 0 ? 100 / (price + 100) : Math.abs(price) / (Math.abs(price) + 100));

export function settleSpread(game: CfbGame, side: 'HOME' | 'AWAY', line?: number): Settle {
  const homeScore = Number(game.home.score) || 0;
  const awayScore = Number(game.away.score) || 0;
  const margin = side === 'HOME' ? homeScore - awayScore : awayScore - homeScore;
  const team = side === 'HOME' ? game.home : game.away;
  if (line == null || Number.isNaN(line)) {
    return {
      result: margin > 0 ? BetResult.WIN : margin < 0 ? BetResult.LOSS : BetResult.VOID,
      label: `${side === 'HOME' ? 'HOME' : 'AWAY'} ML ${margin > 0 ? 'won' : margin < 0 ? 'lost' : 'push'}`,
      edge: 'n/a',
      detail: `No line in feed — graded straight up. ${game.away.abr} ${awayScore} @ ${game.home.abr} ${homeScore}.`,
    };
  }
  const cover = margin + line;
  const result = cover > 0 ? BetResult.WIN : cover < 0 ? BetResult.LOSS : BetResult.VOID;
  return {
    result,
    label: `${team.abr} ${line > 0 ? '+' : ''}${line} ${result === BetResult.WIN ? 'covered' : result === BetResult.LOSS ? 'failed to cover' : 'pushed'}`,
    edge: 'n/a',
    detail: `${team.name} closed ${line > 0 ? '+' : ''}${line}. Final ${game.away.abr} ${awayScore} @ ${game.home.abr} ${homeScore} — margin ${margin > 0 ? '+' : ''}${margin}, cover by ${cover.toFixed(1)}.`,
  };
}

export function settleTotal(game: CfbGame, total?: number): Settle {
  const points = (Number(game.home.score) || 0) + (Number(game.away.score) || 0);
  if (total == null || Number.isNaN(total)) {
    return {
      result: BetResult.VOID,
      label: 'Total not priced in feed',
      edge: 'n/a',
      detail: `Final points ${points}. No closing total available for 2006 events.`,
    };
  }
  const diff = points - total;
  const result = diff > 0 ? BetResult.WIN : diff < 0 ? BetResult.LOSS : BetResult.VOID;
  return {
    result,
    label: `OVER ${total} ${result === BetResult.WIN ? 'cashed' : result === BetResult.LOSS ? 'lost' : 'pushed'}`,
    edge: 'n/a',
    detail: `Final points ${points} vs closing ${total}.`,
  };
}

// ---------------------------------------------------------------------------
// Board / archive projections — these feed the existing NFL-shaped pages.
// ---------------------------------------------------------------------------

const unitForWeek = (week: string) => 1.0;

function poolForGame(game: CfbGame, idx: number): WeekData['pools'][number] {
  const spread = game.line?.spread;
  const total = game.line?.total;
  const side: 'HOME' | 'AWAY' = idx % 3 === 0 ? 'HOME' : 'AWAY';
  const spreadSettle = settleSpread(game, side, spread);
  const totalSettle = settleTotal(game, total);
  const stakeSpread = 100 * unitForWeek(game.week) * (idx % 2 === 0 ? 1 : 0.6);
  const stakeTotal = 100 * unitForWeek(game.week) * 0.5;
  const toProfit = (settle: Settle, stake: number) => {
    if (settle.result === BetResult.WIN) return stake * 0.9091;
    if (settle.result === BetResult.LOSS) return -stake;
    return 0;
  };
  const betSide = side === 'HOME' ? game.home : game.away;
  return {
    id: `cfb-pool-${game.id}`,
    name: `${game.away.abr} @ ${game.home.abr}`,
    bets: [
      {
        id: `${game.id}-spread`,
        description: `${betSide.abr} ${spread != null ? (spread > 0 ? '+' : '') + spread : 'ML'} — ${spreadSettle.label}`,
        stake: Math.round(stakeSpread),
        units: +(stakeSpread / 100).toFixed(2),
        odds: '-110',
        result: spreadSettle.result,
        profit: +toProfit(spreadSettle, stakeSpread).toFixed(2),
        score: `${game.away.abr} ${game.away.score} - ${game.home.abr} ${game.home.score}`,
        betType: 'SINGLE',
      },
      {
        id: `${game.id}-total`,
        description: total != null ? `O/U ${total} — ${totalSettle.label}` : 'Total — unpriced',
        stake: Math.round(stakeTotal),
        units: +(stakeTotal / 100).toFixed(2),
        odds: '-110',
        result: totalSettle.result,
        profit: +toProfit(totalSettle, stakeTotal).toFixed(2),
        score: `${Number(game.home.score) + Number(game.away.score)} pts`,
        betType: 'SINGLE',
      },
    ],
    netProfit: 0,
    roi: 0,
  };
}

function finalizePool(pool: WeekData['pools'][number]) {
  const net = pool.bets.reduce((s, b) => s + b.profit, 0);
  const staked = pool.bets.reduce((s, b) => s + b.stake, 0);
  pool.netProfit = +net.toFixed(2);
  pool.roi = staked ? +((net / staked) * 100).toFixed(1) : 0;
  return pool;
}

function summaryMarkdown(season: number, week: string, games: CfbGame[]): string {
  const finals = games.filter((g) => g.completed);
  const homeWins = finals.filter((g) => g.home.winner).length;
  const awayWins = finals.filter((g) => g.away.winner).length;
  const points = finals.map((g) => Number(g.home.score) + Number(g.away.score));
  const avgPoints = points.length ? (points.reduce((a, b) => a + b, 0) / points.length).toFixed(1) : '—';
  const biggest = finals
    .slice()
    .sort(
      (a, b) =>
        Math.abs(Number(b.home.score) - Number(b.away.score)) - Math.abs(Number(a.home.score) - Number(a.away.score))
    )[0];
  const lines = [
    `# ${season} CFB ${week} — FINAL RESULTS`,
    '',
    `## Season Replay`,
    `Every line on this board is graded from the ESPN box score. The 2006 feed carries no closing spreads, so spread plays are graded straight up unless a line is attached.`,
    '',
    `- Games with a final: **${finals.length}** of ${games.length}`,
    `- Home / away splits: **${homeWins}-${awayWins}**`,
    `- Average combined points: **${avgPoints}**`,
  ];
  if (biggest) {
    lines.push(
      `- Biggest blowout: **${biggest.away.abr} ${biggest.away.score} @ ${biggest.home.abr} ${biggest.home.score}**`
    );
  }
  lines.push('', '## Straight-Up Ledger', '');
  finals.forEach((g) => {
    const winner = g.home.winner ? g.home : g.away;
    const settle = settleSpread(g, g.home.winner ? 'HOME' : 'AWAY', g.line?.spread);
    lines.push(
      `- **${g.away.abr} ${g.away.score} @ ${g.home.abr} ${g.home.score}** | Winner: ${winner.abr} | Seat: ${settle.result}`
    );
  });
  return lines.join('\n');
}

export function buildWeekData(games: CfbGame[], week: string, season: number = LIVE_SEASON): WeekData {
  const pools = games.map(poolForGame).map(finalizePool);
  const net = pools.reduce((s, p) => s + p.netProfit, 0);
  const staked = pools.reduce((s, p) => s + p.bets.reduce((a, b) => a + b.stake, 0), 0);
  const first = games.map((g) => g.kickoff).sort()[0] || '';
  return {
    id: `cfb-${season}-${week.replace(/\s+/g, '-').toLowerCase()}`,
    title: `${season} ${week}`,
    date: first.slice(0, 10),
    overallRoi: staked ? +((net / staked) * 100).toFixed(1) : 0,
    pools,
    league: 'CFB' as League,
  };
}

export function buildArchiveEntry(season: number, week: string, games: CfbGame[]): PickArchiveItem {
  return {
    id: `cfb-archive-${season}-${week.replace(/\s+/g, '-').toLowerCase()}`,
    date: games.map((g) => g.date).sort()[0] || '',
    title: `${season} ${week} Alpha Feed`,
    content: summaryMarkdown(season, week, games),
    league: 'CFB' as League,
  };
}

export function buildGameSummary(game: CfbGame): GameSummary {
  return {
    id: `cfb-sum-${game.id}`,
    date: game.date,
    title: `${game.away.abr} @ ${game.home.abr} — ${game.status}`,
    content: `# ${game.away.name} @ ${game.home.name}\n\n**Final:** ${game.away.abr} ${game.away.score} — ${game.home.abr} ${game.home.score}\n\n- Venue: ${game.venue || 'n/a'}${game.neutralSite ? ' (neutral site)' : ''}\n- Week: ${game.week}\n- Line captured by feed: ${game.line ? `spread ${game.line.spread ?? '—'}, total ${game.line.total ?? '—'}` : 'none (ESPN does not publish CFB closing lines)'}\n\nSpread grade: ${settleSpread(game, game.home.winner ? 'HOME' : 'AWAY', game.line?.spread).detail}`,
    league: 'CFB' as League,
  };
}

export const CFB_BOARD_WEEKS = 15;

export function persistedArchive(): PickArchiveItem[] {
  return readLS<PickArchiveItem[]>(ARCHIVE_KEY, []);
}

export function persistArchive(items: PickArchiveItem[]) {
  writeLS(ARCHIVE_KEY, items);
}

export function roundRobinRecord(weeks: WeekData[]): { bets: number; wins: number; losses: number; pushes: number; staked: number; net: number } {
  return weeks.reduce(
    (acc, w) => {
      w.pools.forEach((p) =>
        p.bets.forEach((b) => {
          acc.bets += 1;
          acc.staked += b.stake;
          acc.net += b.profit;
          if (b.result === BetResult.WIN) acc.wins += 1;
          else if (b.result === BetResult.LOSS) acc.losses += 1;
          else acc.pushes += 1;
        })
      );
      return acc;
    },
    { bets: 0, wins: 0, losses: 0, pushes: 0, staked: 0, net: 0 }
  );
}
