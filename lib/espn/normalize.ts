import type { LeagueKey } from './leagues';

export interface EventRow {
  espn_id: string;
  league: LeagueKey;
  name: string | null;
  short_name: string | null;
  start_time: string | null;
  status_state: string | null;
  status_detail: string | null;
  completed: boolean;
  season: number | null;
  season_type: number | null;
  week: number | null;
  venue: string | null;
  raw: unknown;
}

export interface CompetitorRow {
  event_id: string;
  team_id: string;
  home_away: 'home' | 'away' | null;
  abbreviation: string | null;
  display_name: string | null;
  logo: string | null;
  score: number | null;
  winner: boolean | null;
}

export interface OddsSnapshotRow {
  event_id: string;
  provider: string;
  spread: number | null;
  over_under: number | null;
  details: string | null;
  ml_home: number | null;
  ml_away: number | null;
  captured_at: string;
}

export interface NormalizedBatch {
  league: LeagueKey;
  events: EventRow[];
  competitors: CompetitorRow[];
  odds: OddsSnapshotRow[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : typeof v === 'number' ? String(v) : null;
}

/** American moneyline string ("-119", "+101", "EVEN") -> integer. */
export function parseMoneyline(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.trim().toUpperCase();
  if (s === 'EVEN' || s === 'EV') return 100;
  const n = Number(s.replace(/^\+/, ''));
  return Number.isFinite(n) && s !== '' ? n : null;
}

function moneylineSide(ml: Any, side: 'home' | 'away', odds: Any): number | null {
  const fromMl = ml?.[side]?.close?.odds ?? ml?.[side]?.current?.odds ?? ml?.[side]?.open?.odds;
  const v = parseMoneyline(fromMl);
  if (v !== null) return v;
  // core.api style: homeTeamOdds.moneyLine
  return parseMoneyline(odds?.[`${side}TeamOdds`]?.moneyLine);
}

export function normalizeEvent(ev: Any, league: LeagueKey, capturedAt: string) {
  const comp: Any = ev?.competitions?.[0] ?? {};
  const espnId = str(ev?.id) ?? str(comp?.id);
  if (!espnId) return null;
  const statusType: Any = ev?.status?.type ?? comp?.status?.type ?? {};

  const event: EventRow = {
    espn_id: espnId,
    league,
    name: str(ev?.name),
    short_name: str(ev?.shortName),
    start_time: str(ev?.date) ?? str(comp?.date),
    status_state: str(statusType.state),
    status_detail: str(statusType.shortDetail) ?? str(statusType.detail),
    completed: statusType.completed === true,
    season: num(ev?.season?.year),
    season_type: num(ev?.season?.type),
    week: num(ev?.week?.number),
    venue: str(comp?.venue?.fullName),
    raw: ev,
  };

  const competitors: CompetitorRow[] = [];
  for (const c of Array.isArray(comp?.competitors) ? comp.competitors : []) {
    const teamId = str(c?.team?.id) ?? str(c?.id);
    if (!teamId) continue;
    competitors.push({
      event_id: espnId,
      team_id: teamId,
      home_away: c?.homeAway === 'home' || c?.homeAway === 'away' ? c.homeAway : null,
      abbreviation: str(c?.team?.abbreviation),
      display_name: str(c?.team?.displayName),
      logo: str(c?.team?.logo),
      score: event.status_state === 'pre' ? null : num(c?.score),
      winner: typeof c?.winner === 'boolean' ? c.winner : null,
    });
  }

  const odds: OddsSnapshotRow[] = [];
  for (const o of Array.isArray(comp?.odds) ? comp.odds : []) {
    const provider = str(o?.provider?.name) ?? str(o?.provider?.id) ?? 'unknown';
    const row: OddsSnapshotRow = {
      event_id: espnId,
      provider,
      spread: num(o?.spread),
      over_under: num(o?.overUnder),
      details: str(o?.details),
      ml_home: moneylineSide(o?.moneyline, 'home', o),
      ml_away: moneylineSide(o?.moneyline, 'away', o),
      captured_at: capturedAt,
    };
    const empty = row.spread === null && row.over_under === null && row.details === null && row.ml_home === null && row.ml_away === null;
    if (!empty) odds.push(row);
  }

  return { event, competitors, odds };
}

/** Pure: map an ESPN site-API scoreboard payload to typed rows. */
export function normalizeScoreboard(json: unknown, league: LeagueKey, capturedAt: string = new Date().toISOString()): NormalizedBatch {
  const batch: NormalizedBatch = { league, events: [], competitors: [], odds: [] };
  const events: Any[] = Array.isArray((json as Any)?.events) ? (json as Any).events : [];
  for (const ev of events) {
    const n = normalizeEvent(ev, league, capturedAt);
    if (!n) continue;
    batch.events.push(n.event);
    batch.competitors.push(...n.competitors);
    batch.odds.push(...n.odds);
  }
  return batch;
}
