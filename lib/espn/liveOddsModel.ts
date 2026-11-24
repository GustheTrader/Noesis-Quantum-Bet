/** Pure mappings from the espn read layer to the LiveOdds rows and TeamTicker entries (slice 3). */
import type { BoardMatchup } from './boardModel';
import type { EventRead } from './reader';

export const OFF = 'OFF';

export interface LiveOddsRow {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  isLive: boolean;
  isFinal: boolean;
  /** Formatted per-side spread, e.g. "-3.5" / "+3.5" / "PK", or OFF. */
  spreadAway: string;
  spreadHome: string;
  /** Formatted total, e.g. "48.5", or OFF. */
  total: string;
  mlAway: string;
  mlHome: string;
  provider: string | null;
  capturedAt: string | null;
}

const orOff = (s: string | undefined | null) => (s && s.trim() ? s : OFF);

/** BoardMatchup -> LiveOdds row. Real lines only: missing values render as OFF (no estimated moneylines, no fake EV). */
export function toLiveOddsRow(m: BoardMatchup): LiveOddsRow {
  const b = m.market;
  return {
    id: m.id,
    homeTeam: m.homeAbr,
    awayTeam: m.awayAbr,
    homeLogo: m.homeLogo,
    awayLogo: m.awayLogo,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status,
    isLive: m.statusState === 'in',
    isFinal: m.statusState === 'post',
    spreadAway: orOff(b?.spreadAway),
    spreadHome: orOff(b?.spreadHome),
    total: orOff(b?.total),
    mlAway: orOff(b?.mlAway),
    mlHome: orOff(b?.mlHome),
    provider: m.marketProvider,
    capturedAt: b?.capturedAt ?? null,
  };
}

/** Live games first, then upcoming by start time, finals last. Stable for ties. */
export function toLiveOddsRows(matchups: BoardMatchup[]): LiveOddsRow[] {
  const rank = (m: BoardMatchup) => (m.statusState === 'in' ? 0 : m.statusState === 'post' ? 2 : 1);
  return matchups
    .map((m, i) => ({ m, i }))
    .sort((a, b) => rank(a.m) - rank(b.m) || a.m.date.getTime() - b.m.date.getTime() || a.i - b.i)
    .map(({ m }) => toLiveOddsRow(m));
}

export interface TickerTeam {
  abbr: string;
  logo: string | null;
}

/** Unique teams playing in the given events (away then home, in event order). */
export function toTickerTeams(events: EventRead[]): TickerTeam[] {
  const seen = new Set<string>();
  const out: TickerTeam[] = [];
  for (const e of events) {
    for (const c of [e.away, e.home]) {
      const abbr = c?.abbreviation?.trim();
      if (!abbr || seen.has(abbr)) continue;
      seen.add(abbr);
      out.push({ abbr, logo: c?.logo ?? null });
    }
  }
  return out;
}
