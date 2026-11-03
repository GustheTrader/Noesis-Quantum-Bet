/**
 * ESPN odds poller (slice 3). Pure orchestration with injected deps so it can be unit-tested:
 * - per tick: today's + tomorrow's US-Eastern scoreboards for each league
 * - one ESPN fetch per (league, date), fanned out to N pluggable writers (e.g. Zo + cloud)
 * - leagues/dates with no events are skipped (nothing written)
 * - <= `concurrency` fetches in flight; one league or one writer failing never fails the tick
 * - runner: fixed-rate ticks, never overlapping, exponential backoff after a failed tick
 */
import { EspnHttpError, fetchScoreboard, type ClientOptions } from './client';
import { ingestBatch, type EspnDbWriter, type IngestResult } from './ingest';
import type { LeagueKey } from './leagues';
import { normalizeScoreboard, type NormalizedBatch } from './normalize';

export const POLL_JOB = 'poll';
export const ESPN_USER_AGENT = 'quantumbets-espn-ingest/0.1';
export const DEFAULT_LEAGUES: LeagueKey[] = ['nfl', 'nba', 'nhl', 'mlb'];

/** [today, tomorrow] as ESPN `YYYYMMDD` in `timeZone` (default US Eastern). DST-safe. */
export function pollDates(now: Date, timeZone = 'America/New_York'): [string, string] {
  // (self-contained rather than importing reader.ts so the Node poller has no browser-layer deps)
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map((x) => [x.type, x.value]),
  );
  const today = `${p.year}-${p.month}-${p.day}`;
  const [y, m, d] = today.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  const tomorrow = `${t.getUTCFullYear()}${String(t.getUTCMonth() + 1).padStart(2, '0')}${String(t.getUTCDate()).padStart(2, '0')}`;
  return [today.replace(/-/g, ''), tomorrow];
}

/** Run async tasks with at most `limit` in flight. Results keep input order; never rejects. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = { status: 'fulfilled', value: await fn(items[i]) };
      } catch (reason) {
        out[i] = { status: 'rejected', reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return out;
}

/** Strip anything that looks like a connection string / credential from an error message. */
export function redact(msg: string): string {
  return msg
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s@/]*@/gi, (m) => m.replace(/\/\/[^@]*@/, '//***@'))
    .replace(/(password|apikey|authorization|token)=\S+/gi, '$1=***')
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '***');
}

const errMsg = (e: unknown) => redact(e instanceof Error ? e.message : String(e));

export interface NamedWriter {
  /** Non-secret label for logs, e.g. "zo" or "cloud". */
  name: string;
  writer: EspnDbWriter;
}

export interface TickDeps {
  writers: NamedWriter[];
  leagues?: LeagueKey[];
  concurrency?: number;
  now?: () => Date;
  /** Fetch one scoreboard; default = ESPN client with the custom User-Agent. */
  fetch?: (league: LeagueKey, date: string) => Promise<{ status: number; data: unknown }>;
  client?: ClientOptions;
}

export interface WriterOutcome {
  writer: string;
  ok: boolean;
  result?: IngestResult;
  error?: string;
}

export interface TaskOutcome {
  league: LeagueKey;
  date: string;
  status: 'ingested' | 'skipped' | 'fetch_error';
  events: number;
  writers: WriterOutcome[];
  error?: string;
}

export interface TickSummary {
  startedAt: string;
  finishedAt: string;
  tasks: TaskOutcome[];
  /** true if every attempted fetch and write failed (used for backoff). */
  allFailed: boolean;
}

export function defaultFetch(client: ClientOptions = {}) {
  return (league: LeagueKey, date: string) =>
    fetchScoreboard(league, date, {
      timeoutMs: 10_000,
      retries: 1,
      ...client,
      headers: { 'User-Agent': ESPN_USER_AGENT, ...(client.headers ?? {}) },
    });
}

async function logFetchFailure(writers: NamedWriter[], league: string, code: number | null, error: string, startedAt: string, finishedAt: string) {
  await Promise.all(
    writers.map(({ writer }) =>
      writer
        .insertIngestRun({ job: POLL_JOB, league, status: 'error', http_code: code, rows: 0, error, started_at: startedAt, finished_at: finishedAt })
        .catch(() => undefined),
    ),
  );
}

/** One poll tick. Never throws. */
export async function runPollTick(deps: TickDeps): Promise<TickSummary> {
  const now = deps.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const leagues = deps.leagues ?? DEFAULT_LEAGUES;
  const fetchFn = deps.fetch ?? defaultFetch(deps.client);
  const dates = pollDates(now());
  const jobs = leagues.flatMap((league) => dates.map((date) => ({ league, date })));

  const settled = await mapLimit(jobs, deps.concurrency ?? 4, async ({ league, date }): Promise<TaskOutcome> => {
    const taskStart = now().toISOString();
    let res: { status: number; data: unknown };
    try {
      res = await fetchFn(league, date);
    } catch (e) {
      const error = errMsg(e);
      await logFetchFailure(deps.writers, league, e instanceof EspnHttpError ? e.status : null, error, taskStart, now().toISOString());
      return { league, date, status: 'fetch_error', events: 0, writers: [], error };
    }
    let batch: NormalizedBatch;
    try {
      batch = normalizeScoreboard(res.data, league, now().toISOString());
    } catch (e) {
      const error = `normalize: ${errMsg(e)}`;
      await logFetchFailure(deps.writers, league, res.status, error, taskStart, now().toISOString());
      return { league, date, status: 'fetch_error', events: 0, writers: [], error };
    }
    if (batch.events.length === 0) return { league, date, status: 'skipped', events: 0, writers: [] };

    const writers = await Promise.all(
      deps.writers.map(async ({ name, writer }): Promise<WriterOutcome> => {
        try {
          const result = await ingestBatch(batch, writer, { job: POLL_JOB, httpCode: res.status, startedAt: taskStart, now });
          return { writer: name, ok: true, result };
        } catch (e) {
          return { writer: name, ok: false, error: errMsg(e) };
        }
      }),
    );
    return { league, date, status: 'ingested', events: batch.events.length, writers };
  });

  const tasks = settled.map((s, i) =>
    s.status === 'fulfilled'
      ? s.value
      : ({ ...jobs[i], status: 'fetch_error', events: 0, writers: [], error: errMsg(s.reason) } as TaskOutcome),
  );
  const attempted = tasks.filter((t) => t.status !== 'skipped');
  const allFailed = attempted.length > 0 && attempted.every((t) => t.status === 'fetch_error' || t.writers.every((w) => !w.ok));
  return { startedAt, finishedAt: now().toISOString(), tasks, allFailed };
}

/** One-line, secret-free log summary. */
export function summarizeTick(s: TickSummary): string {
  const parts = s.tasks.map((t) => {
    if (t.status === 'skipped') return `${t.league}/${t.date}:skip`;
    if (t.status === 'fetch_error') return `${t.league}/${t.date}:FETCH_ERR(${t.error})`;
    const w = t.writers
      .map((x) => (x.ok ? `${x.writer}+${x.result!.oddsInserted}/${x.result!.oddsSkipped}` : `${x.writer}:ERR(${x.error})`))
      .join(',');
    return `${t.league}/${t.date}:${t.events}ev[${w}]`;
  });
  return `tick ${s.startedAt} ${parts.join(' ')}${s.allFailed ? ' ALL_FAILED' : ''}`;
}

// ---- runner ----

export interface LoopOptions {
  tick: () => Promise<{ allFailed?: boolean } | void>;
  intervalMs?: number; // default 60s
  maxBackoffMs?: number; // default 10 min
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  onError?: (e: unknown) => void;
}

/**
 * Fixed-rate loop: next tick starts `intervalMs` after the previous one STARTED (or immediately if it overran).
 * Ticks never overlap (`runOnce` returns 'skipped' if one is in flight). After a failed tick
 * (throw or allFailed) the delay doubles up to `maxBackoffMs`; it resets after a good tick.
 */
export function createPollLoop(opts: LoopOptions) {
  const interval = opts.intervalMs ?? 60_000;
  const maxBackoff = opts.maxBackoffMs ?? 600_000;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = opts.now ?? Date.now;
  let running = false;
  let stopped = false;
  let failures = 0;
  let loopPromise: Promise<void> | null = null;

  async function runOnce(): Promise<'ok' | 'failed' | 'skipped'> {
    if (running) return 'skipped';
    running = true;
    try {
      const r = await opts.tick();
      return r && r.allFailed ? 'failed' : 'ok';
    } catch (e) {
      opts.onError?.(e);
      return 'failed';
    } finally {
      running = false;
    }
  }

  function nextDelay(outcome: 'ok' | 'failed' | 'skipped', elapsedMs: number): number {
    if (outcome === 'failed') {
      failures++;
      return Math.min(maxBackoff, interval * 2 ** (failures - 1));
    }
    if (outcome === 'ok') failures = 0;
    return Math.max(0, interval - elapsedMs);
  }

  return {
    runOnce,
    nextDelay,
    get isRunning() {
      return running;
    },
    get consecutiveFailures() {
      return failures;
    },
    start(): Promise<void> {
      if (loopPromise) return loopPromise;
      stopped = false;
      loopPromise = (async () => {
        while (!stopped) {
          const t0 = now();
          const outcome = await runOnce();
          if (stopped) break;
          await sleep(nextDelay(outcome, now() - t0));
        }
      })();
      return loopPromise;
    },
    /** Request stop; the loop exits once the in-flight tick (if any) finishes. */
    stop() {
      stopped = true;
    },
  };
}
