import type { League } from '../types';

/**
 * Live odds client, backed by TheRundown (via `/api/rundown`, which holds the key).
 *
 * The route already flattens each event into per-book rows, so this module only has to
 * match rows to board games and merge prices. Nothing here invents a price: a game with
 * no quote keeps its own 'NL'.
 */

export interface OddsEvent {
  event_id: string;
  league: League;
  start_time: number;
  status: string;
  home: string;
  away: string;
  home_abbr?: string;
  away_abbr?: string;
  books: Record<string, BookQuote>;
}

export interface BookQuote {
  /** Home/away moneyline, American. */
  mlHome?: number;
  mlAway?: number;
  /** Away-perspective spread (what the board's away column shows) and its price. */
  spread?: string;
  spreadPrice?: string;
  /** Home-perspective spread and its price. */
  spreadHome?: string;
  spreadHomePrice?: string;
  total?: string;
  overPrice?: string;
  underPrice?: string;
}

export interface RundownFeed {
  events: OddsEvent[];
  usage?: Record<string, string> | null;
  error?: string;
  limited?: boolean;
  missing_key?: boolean;
}

export const LEAGUE_CODES: Partial<Record<League, { sport: number; league: string }>> = {
  NFL: { sport: 2, league: 'NFL' },
  CFB: { sport: 1, league: 'NCAAF' },
  NBA: { sport: 4, league: 'NBA' },
  NHL: { sport: 6, league: 'NHL' },
  MLB: { sport: 3, league: 'MLB' },
  CFL: { sport: 9, league: 'CFL' },
  MLS: { sport: 10, league: 'MLS' },
  SOCCER: { sport: 11, league: 'EPL' },
  MMA: { sport: 7, league: 'UFC' },
  GOLF: { sport: 40, league: 'PGA' },
};

export const fmtAmerican = (american?: number) => {
  if (american === undefined || !Number.isFinite(american) || american === 0) return 'NL';
  return american > 0 ? `+${american}` : `${american}`;
};

const fmtLine = (line?: string) => (line ? line : undefined);

/* -------------------------------------------------------------- transport */

const getFeed = async (league: League, days = 1): Promise<RundownFeed> => {
  const search = new URLSearchParams({ league, days: String(days) });
  const res = await fetch(`/api/rundown?${search.toString()}`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`rundown ${league} -> ${res.status}`);
  const body = (await res.json()) as RundownFeed;
  return { ...body, events: body.events || [] };
};

export const getLeagueEvents = async (league: League, opts: { days?: number } = {}): Promise<OddsEvent[]> => {
  if (!LEAGUE_CODES[league]) return [];
  const feed = await getFeed(league, opts.days ?? 1);
  return feed.events;
};

export const getFeedStatus = async (league: League) => getFeed(league, 1);

/* -------------------------------------------------------------- matching */

const NOISE = new Set([
  'fc', 'cf', 'sc', 'afc', 'cfc', 'club', 'de', 'the', 'of', 'city', 'united', 'utd',
  'county', 'athletic', 'sporting', 'real', 'state', 'st', 'university', 'college',
  'football', 'basketball', 'hockey', 'baseball', 'team', 'chicago', 'new', 'san', 'los',
]);

export const teamKey = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !NOISE.has(t))
    .slice(0, 2)
    .join('');

const pairKey = (home: string, away: string) => `${teamKey(home)}|${teamKey(away)}`;

export const indexEvents = (events: OddsEvent[]): Map<string, OddsEvent> => {
  const map = new Map<string, OddsEvent>();
  for (const e of events) {
    map.set(pairKey(e.home, e.away), e);
    map.set(pairKey(e.away, e.home), e);
    // Board rows usually carry abbreviations, so index those too.
    if (e.home_abbr && e.away_abbr) {
      map.set(pairKey(e.home_abbr, e.away_abbr), e);
      map.set(pairKey(e.away_abbr, e.home_abbr), e);
    }
  }
  return map;
};

export const matchEvent = (index: Map<string, OddsEvent>, home: string, away: string) =>
  index.get(pairKey(home, away));

/* ------------------------------------------------------------- consensus */

const bestNumber = (vals: Array<number | undefined>, mode: 'high' | 'low') => {
  const clean = vals.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (!clean.length) return undefined;
  return clean.reduce((a, b) => (mode === 'high' ? Math.max(a, b) : Math.min(a, b)));
};

/** Market consensus from the books that actually quoted the game. */
export const buildConsensus = (books: Record<string, BookQuote>) => {
  const rows = Object.values(books || {});
  if (!rows.length) return null;

  const mlHome = bestNumber(rows.map((r) => r.mlHome), 'high');
  const mlAway = bestNumber(rows.map((r) => r.mlAway), 'high');

  const spreads = rows.map((r) => r.spread).filter(Boolean) as string[];
  const spread = spreads.length ? spreads[0] : 'NL';

  const totals = rows.map((r) => r.total).filter(Boolean) as string[];
  const total = totals.length ? totals[0] : 'NL';

  return {
    spread,
    total,
    mlHome: fmtAmerican(mlHome),
    mlAway: fmtAmerican(mlAway),
    books: rows.length,
  };
};

/* ---------------------------------------------------------------- attach */

export interface OddsAttachResult {
  live: boolean;
  priced: number;
  books: number;
  source: 'therundown' | 'none';
  message?: string;
}

/**
 * Merge live prices into board rows. Rows match on team names, never on order or index,
 * so a rescheduled game cannot inherit another game's line.
 */
export const applyOddsToGames = async <
  T extends {
    homeTeam: string;
    awayTeam: string;
    id: string;
    consensusSpread?: string;
    consensusTotal?: string;
    consensusMlHome?: string;
    consensusMlAway?: string;
    bookOdds: Record<string, BookQuote | any>;
  }
>(
  games: T[],
  league: League,
  _opts: Record<string, unknown> = {}
): Promise<{ games: T[]; result: OddsAttachResult }> => {
  const empty: OddsAttachResult = { live: false, priced: 0, books: 0, source: 'none' };
  if (!LEAGUE_CODES[league] || games.length === 0) return { games, result: empty };

  let feed: RundownFeed;
  try {
    feed = await getFeed(league, 2);
  } catch (err: any) {
    return { games, result: { ...empty, message: err?.message || 'feed unreachable' } };
  }
  if (feed.missing_key) {
    return { games, result: { ...empty, message: 'no THERUNDOWN_API_KEY' } };
  }
  if (!feed.events.length) {
    return { games, result: { ...empty, message: feed.error || 'no events for this date' } };
  }

  const index = indexEvents(feed.events);
  const books = new Set<string>();
  let priced = 0;

  const merged = games.map((game) => {
    const event = matchEvent(index, game.homeTeam, game.awayTeam);
    if (!event) return game;
    const consensus = buildConsensus(event.books);
    if (!consensus) return game;

    priced += 1;
    Object.keys(event.books).forEach((b) => books.add(b));

    return {
      ...game,
      consensusSpread: consensus.spread,
      consensusTotal: consensus.total,
      consensusMlHome: consensus.mlHome,
      consensusMlAway: consensus.mlAway,
      bookOdds: { ...game.bookOdds, ...event.books },
    } as T;
  });

  return {
    games: merged,
    result: { live: priced > 0, priced, books: books.size, source: 'therundown' },
  };
};

/* --------------------------------------------------- feed-only slates */

const abbr = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();

/** Feed events as board rows, for leagues ESPN does not carry. */
export const eventsToSlate = (events: OddsEvent[], league: League, limit = 24) =>
  events
    .filter((e) => e.status !== 'final' && e.status !== 'closed')
    .slice(0, limit)
    .map((e) => {
      const consensus = buildConsensus(e.books);
      return {
        id: `tr-${e.event_id}`,
        league,
        date: new Date((e.start_time || 0) * 1000),
        status: e.status === 'inprogress' || e.status === 'in_play' ? 'Live' : 'Scheduled',
        homeTeam: e.home,
        awayTeam: e.away,
        homeAbr: abbr(e.home),
        awayAbr: abbr(e.away),
        homeLogo: '',
        awayLogo: '',
        openSpread: 'NL',
        openTotal: 'NL',
        consensusSpread: consensus?.spread || 'NL',
        consensusTotal: consensus?.total || 'NL',
        consensusMlHome: consensus?.mlHome || 'NL',
        consensusMlAway: consensus?.mlAway || 'NL',
        bookOdds: e.books as Record<string, BookQuote>,
        aiStatus: 'IDLE' as const,
        oddsEventId: e.event_id,
      };
    });
