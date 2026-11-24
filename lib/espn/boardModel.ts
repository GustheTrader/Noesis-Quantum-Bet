/** Pure mapping from the espn read layer to the OddsBoard row model (slice 2). */
import type { LeagueKey } from './leagues';
import { formatMoneyline, formatSpread, formatTotal, type EventRead, type OddsByEvent, type OddsLine, type ProviderOdds } from './reader';

export interface BoardBook {
  /** Away-side spread, home-side spread (formatted). */
  spreadAway: string;
  spreadHome: string;
  total: string;
  mlAway: string;
  mlHome: string;
  capturedAt: string;
}

export interface BoardMatchup {
  id: string;
  date: Date;
  status: string;
  statusState: string | null;
  homeTeam: string;
  homeAbr: string;
  homeLogo?: string;
  homeScore: number | null;
  awayTeam: string;
  awayAbr: string;
  awayLogo?: string;
  awayScore: number | null;
  /** Primary provider's opening (first captured) line. */
  open: BoardBook | null;
  /** Primary provider's latest line. */
  market: BoardBook | null;
  marketProvider: string | null;
  /** Latest line keyed by OddsBoard book id (pinnacle, circa, dk, fd, czr). */
  bookOdds: Record<string, BoardBook>;
}

/** App league code (e.g. 'NBA') -> ingested espn league key, or null if not ingested. */
export function toLeagueKey(appLeague: string): LeagueKey | null {
  const k = appLeague.toLowerCase();
  return k === 'nfl' || k === 'nba' || k === 'nhl' || k === 'mlb' ? k : null;
}

/** ESPN provider name -> OddsBoard book id. */
export function providerToBookId(provider: string): string | null {
  const p = provider.toLowerCase().replace(/[^a-z]/g, '');
  if (p.includes('draftkings')) return 'dk';
  if (p.includes('fanduel')) return 'fd';
  if (p.includes('caesars') || p.includes('williamhill')) return 'czr';
  if (p.includes('pinnacle')) return 'pinnacle';
  if (p.includes('circa')) return 'circa';
  return null;
}

const PROVIDER_PRIORITY = ['dk', 'fd', 'czr', 'pinnacle', 'circa'];

export function toBoardBook(l: OddsLine): BoardBook {
  return {
    spreadAway: formatSpread(l.spreadAway),
    spreadHome: formatSpread(l.spreadHome),
    total: formatTotal(l.overUnder),
    mlAway: formatMoneyline(l.mlAway),
    mlHome: formatMoneyline(l.mlHome),
    capturedAt: l.capturedAt,
  };
}

function primary(list: ProviderOdds[]): ProviderOdds | null {
  if (list.length === 0) return null;
  const rank = (p: ProviderOdds) => {
    const id = providerToBookId(p.provider);
    const i = id ? PROVIDER_PRIORITY.indexOf(id) : -1;
    return i === -1 ? PROVIDER_PRIORITY.length : i;
  };
  return [...list].sort((a, b) => rank(a) - rank(b))[0];
}

const DEFAULT_LOGO = 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png';

export function toBoardMatchups(events: EventRead[], odds: OddsByEvent): BoardMatchup[] {
  return events.map((e) => {
    const list = odds[e.espn_id] ?? [];
    const main = primary(list);
    const bookOdds: Record<string, BoardBook> = {};
    for (const p of list) {
      const id = providerToBookId(p.provider);
      if (id && !bookOdds[id]) bookOdds[id] = toBoardBook(p.latest);
    }
    return {
      id: e.espn_id,
      date: new Date(e.start_time ?? Date.now()),
      status: e.status_detail ?? 'Scheduled',
      statusState: e.status_state,
      homeTeam: e.home?.display_name ?? 'Home TBD',
      homeAbr: e.home?.abbreviation ?? 'HOME',
      homeLogo: e.home?.logo ?? DEFAULT_LOGO,
      homeScore: e.home?.score ?? null,
      awayTeam: e.away?.display_name ?? 'Away TBD',
      awayAbr: e.away?.abbreviation ?? 'AWAY',
      awayLogo: e.away?.logo ?? DEFAULT_LOGO,
      awayScore: e.away?.score ?? null,
      open: main ? toBoardBook(main.opening) : null,
      market: main ? toBoardBook(main.latest) : null,
      marketProvider: main?.provider ?? null,
      bookOdds,
    };
  });
}

/** Newest odds captured_at across all events (ISO), or null if no odds. */
export function latestCapturedAt(odds: OddsByEvent): string | null {
  let best: string | null = null;
  for (const list of Object.values(odds)) {
    for (const p of list) {
      if (!best || Date.parse(p.latest.capturedAt) > Date.parse(best)) best = p.latest.capturedAt;
    }
  }
  return best;
}

/** Newest events.updated_at (ISO), or null. */
export function latestEventUpdate(events: EventRead[]): string | null {
  let best: string | null = null;
  for (const e of events) if (e.updated_at && (!best || Date.parse(e.updated_at) > Date.parse(best))) best = e.updated_at;
  return best;
}
