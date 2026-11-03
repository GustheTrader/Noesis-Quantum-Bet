import { fetchScoreboard, EspnHttpError, type ClientOptions } from './client';
import type { LeagueKey } from './leagues';
import { normalizeScoreboard, type CompetitorRow, type EventRow, type NormalizedBatch, type OddsSnapshotRow } from './normalize';

export interface IngestRunRow {
  job: string;
  league: string;
  status: 'success' | 'error';
  http_code: number | null;
  rows: number;
  error: string | null;
  started_at: string;
  finished_at: string;
}

/** Storage boundary. Implementations: pgWriter.ts (Postgres), in-memory fakes in tests. */
export interface EspnDbWriter {
  upsertEvents(rows: EventRow[]): Promise<void>;
  upsertCompetitors(rows: CompetitorRow[]): Promise<void>;
  /** Latest snapshot per (event_id, provider) for the given events. Key: `${event_id}|${provider}`. */
  latestOdds(eventIds: string[]): Promise<Map<string, OddsSnapshotRow>>;
  insertOdds(rows: OddsSnapshotRow[]): Promise<void>;
  insertIngestRun(row: IngestRunRow): Promise<void>;
}

export const oddsKey = (o: Pick<OddsSnapshotRow, 'event_id' | 'provider'>) => `${o.event_id}|${o.provider}`;

const ODDS_FIELDS = ['spread', 'over_under', 'details', 'ml_home', 'ml_away'] as const;

function normOdds(field: (typeof ODDS_FIELDS)[number], v: unknown): string | number | null {
  if (v === null || v === undefined) return null;
  if (field === 'details') return String(v);
  const n = Number(v); // Postgres numeric comes back as string
  return Number.isFinite(n) ? n : null;
}

export function oddsChanged(prev: OddsSnapshotRow | undefined, next: OddsSnapshotRow): boolean {
  if (!prev) return true;
  return ODDS_FIELDS.some((f) => normOdds(f, prev[f]) !== normOdds(f, next[f]));
}

export interface IngestResult {
  events: number;
  competitors: number;
  oddsInserted: number;
  oddsSkipped: number;
}

export interface IngestContext {
  job?: string;
  httpCode?: number | null;
  startedAt?: string;
  now?: () => Date;
}

/** Write a normalized batch. Events/competitors are upserted; odds are append-only, only when changed. */
export async function ingestBatch(batch: NormalizedBatch, db: EspnDbWriter, ctx: IngestContext = {}): Promise<IngestResult> {
  const now = ctx.now ?? (() => new Date());
  const startedAt = ctx.startedAt ?? now().toISOString();
  const job = ctx.job ?? 'scoreboard';
  try {
    await db.upsertEvents(batch.events);
    await db.upsertCompetitors(batch.competitors);

    // de-dupe within the batch (last wins) then compare against latest stored snapshot
    const incoming = new Map<string, OddsSnapshotRow>();
    for (const o of batch.odds) incoming.set(oddsKey(o), o);
    const eventIds = [...new Set(batch.odds.map((o) => o.event_id))];
    const latest = eventIds.length ? await db.latestOdds(eventIds) : new Map<string, OddsSnapshotRow>();
    const toInsert = [...incoming.values()].filter((o) => oddsChanged(latest.get(oddsKey(o)), o));
    if (toInsert.length) await db.insertOdds(toInsert);

    const result: IngestResult = {
      events: batch.events.length,
      competitors: batch.competitors.length,
      oddsInserted: toInsert.length,
      oddsSkipped: incoming.size - toInsert.length,
    };
    await db.insertIngestRun({
      job,
      league: batch.league,
      status: 'success',
      http_code: ctx.httpCode ?? null,
      rows: result.events + result.competitors + result.oddsInserted,
      error: null,
      started_at: startedAt,
      finished_at: now().toISOString(),
    });
    return result;
  } catch (err) {
    await recordFailure(db, job, batch.league, ctx.httpCode ?? null, err, startedAt, now);
    throw err;
  }
}

async function recordFailure(db: EspnDbWriter, job: string, league: string, httpCode: number | null, err: unknown, startedAt: string, now: () => Date) {
  try {
    await db.insertIngestRun({
      job,
      league,
      status: 'error',
      http_code: httpCode,
      rows: 0,
      error: err instanceof Error ? err.message : String(err),
      started_at: startedAt,
      finished_at: now().toISOString(),
    });
  } catch {
    /* never mask the original error */
  }
}

/** Fetch one league/day scoreboard, normalize, ingest. Fetch failures are also logged to ingest_runs. */
export async function runScoreboardIngest(
  league: LeagueKey,
  date: Date | string,
  db: EspnDbWriter,
  opts: { client?: ClientOptions; now?: () => Date } = {},
): Promise<IngestResult> {
  const now = opts.now ?? (() => new Date());
  const startedAt = now().toISOString();
  let res;
  try {
    res = await fetchScoreboard(league, date, opts.client);
  } catch (err) {
    const code = err instanceof EspnHttpError ? err.status : null;
    await recordFailure(db, 'scoreboard', league, code, err, startedAt, now);
    throw err;
  }
  const batch = normalizeScoreboard(res.data, league, now().toISOString());
  return ingestBatch(batch, db, { job: 'scoreboard', httpCode: res.status, startedAt, now });
}
