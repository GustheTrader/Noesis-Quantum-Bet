import { getLeague, type LeagueKey } from './leagues';

export const SITE_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

export type FetchLike = (input: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export interface ClientOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number; // default 10s
  retries?: number; // extra attempts after the first, default 3
  baseDelayMs?: number; // backoff base, default 500ms (doubles each retry)
  sleep?: (ms: number) => Promise<void>;
  /** Extra request headers. Server-side runtimes should set a User-Agent: ESPN returns 403 to Bun's default UA. */
  headers?: Record<string, string>;
}

export class EspnHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
  ) {
    super(`ESPN HTTP ${status} for ${url}`);
    this.name = 'EspnHttpError';
  }
}

export class EspnTimeoutError extends Error {
  constructor(public readonly url: string, timeoutMs: number) {
    super(`ESPN request timed out after ${timeoutMs}ms: ${url}`);
    this.name = 'EspnTimeoutError';
  }
}

/** ESPN core API $ref links sometimes use internal `.pvt` hosts; rewrite to public `.com`. */
export function rewritePvt(url: string): string {
  return url.replace(/^(https?:\/\/[^/]*?)\.pvt(?=[/:?#]|$)/i, '$1.com');
}

/** Format a date as ESPN's one-day `dates=YYYYMMDD` param (UTC calendar day for Date inputs). */
export function toEspnDate(d: Date | string): string {
  if (typeof d === 'string') {
    const compact = d.replace(/-/g, '');
    if (!/^\d{8}$/.test(compact)) throw new Error(`Invalid date (want YYYY-MM-DD or YYYYMMDD): ${d}`);
    return compact;
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export function scoreboardUrl(league: LeagueKey, date?: Date | string): string {
  const def = getLeague(league);
  const base = `${SITE_API_BASE}/${def.sport}/${def.league}/scoreboard`;
  return date === undefined ? base : `${base}?dates=${toEspnDate(date)}`;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function isRetryable(err: unknown): boolean {
  if (err instanceof EspnHttpError) return err.status >= 500;
  return true; // network errors and timeouts
}

export interface FetchResult<T = unknown> {
  status: number;
  data: T;
  attempts: number;
}

export async function fetchJson<T = unknown>(rawUrl: string, opts: ClientOptions = {}): Promise<FetchResult<T>> {
  const url = rewritePvt(rawUrl);
  const fetchImpl: FetchLike = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const retries = opts.retries ?? 3;
  const baseDelay = opts.baseDelayMs ?? 500;
  const sleep = opts.sleep ?? defaultSleep;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new EspnTimeoutError(url, timeoutMs));
        }, timeoutMs);
      });
      const res = await Promise.race([fetchImpl(url, opts.headers ? { signal: controller.signal, headers: opts.headers } : { signal: controller.signal }), timeout]);
      if (!res.ok) throw new EspnHttpError(res.status, url);
      const data = (await Promise.race([res.json(), timeout])) as T;
      return { status: res.status, data, attempts: attempt + 1 };
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === retries) throw err;
      await sleep(baseDelay * 2 ** attempt);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  throw lastErr;
}

export function fetchScoreboard(league: LeagueKey, date: Date | string, opts?: ClientOptions) {
  return fetchJson(scoreboardUrl(league, date), opts);
}
