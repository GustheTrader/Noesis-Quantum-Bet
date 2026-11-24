import { afterEach, describe, expect, it, vi } from 'vitest';
import { EspnHttpError, EspnTimeoutError, fetchJson, rewritePvt, scoreboardUrl, toEspnDate, type FetchLike } from '../client';

const okRes = (data: unknown, status = 200) => ({ ok: true, status, json: async () => data });
const errRes = (status: number) => ({ ok: false, status, json: async () => ({}) });
const noSleep = vi.fn(async (_ms: number) => {});

afterEach(() => {
  vi.useRealTimers();
  noSleep.mockClear();
});

describe('rewritePvt', () => {
  it('rewrites .pvt hostnames to .com', () => {
    expect(rewritePvt('http://sports.core.api.espn.pvt/v2/sports/football/leagues/nfl/events/1?lang=en')).toBe(
      'http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/1?lang=en',
    );
    expect(rewritePvt('https://sports.core.api.espn.pvt')).toBe('https://sports.core.api.espn.com');
  });
  it('leaves other urls (and .pvt in paths) alone', () => {
    const u = 'https://site.api.espn.com/apis/x.pvt/y';
    expect(rewritePvt(u)).toBe(u);
  });
});

describe('date + url helpers', () => {
  it('formats one-day YYYYMMDD', () => {
    expect(toEspnDate('2026-11-03')).toBe('20261103');
    expect(toEspnDate('20261103')).toBe('20261103');
    expect(toEspnDate(new Date(Date.UTC(2026, 0, 5)))).toBe('20260105');
    expect(() => toEspnDate('2026-11-01-2026-11-03')).toThrow();
  });
  it('builds scoreboard urls from the league map', () => {
    expect(scoreboardUrl('nba', '2026-11-03')).toBe('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261103');
    expect(scoreboardUrl('mlb')).toBe('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard');
  });
});

describe('fetchJson', () => {
  it('returns data on success and passes the rewritten url', async () => {
    const f = vi.fn<FetchLike>(async () => okRes({ a: 1 }));
    const r = await fetchJson('https://sports.core.api.espn.pvt/v2/x', { fetchImpl: f, sleep: noSleep });
    expect(r).toEqual({ status: 200, data: { a: 1 }, attempts: 1 });
    expect(f.mock.calls[0][0]).toBe('https://sports.core.api.espn.com/v2/x');
  });

  it('passes custom headers (e.g. User-Agent) when provided', async () => {
    const f = vi.fn<FetchLike>(async () => okRes({}));
    await fetchJson('https://x.test/a', { fetchImpl: f, headers: { 'User-Agent': 'qb-ingest/0.1' } });
    expect(f.mock.calls[0][1]?.headers).toEqual({ 'User-Agent': 'qb-ingest/0.1' });
  });

  it('retries on 500 with exponential backoff, then succeeds', async () => {
    const f = vi.fn<FetchLike>().mockResolvedValueOnce(errRes(500)).mockResolvedValueOnce(errRes(502)).mockResolvedValueOnce(okRes({ ok: 1 }));
    const r = await fetchJson('https://x.test/a', { fetchImpl: f, sleep: noSleep, baseDelayMs: 100 });
    expect(r.attempts).toBe(3);
    expect(f).toHaveBeenCalledTimes(3);
    expect(noSleep.mock.calls.map((c) => c[0])).toEqual([100, 200]);
  });

  it('gives up after the retry budget on persistent 5xx', async () => {
    const f = vi.fn<FetchLike>(async () => errRes(503));
    await expect(fetchJson('https://x.test/a', { fetchImpl: f, sleep: noSleep, retries: 2 })).rejects.toMatchObject({ status: 503 });
    expect(f).toHaveBeenCalledTimes(3);
  });

  it('does not retry on 404 (fail fast on 4xx)', async () => {
    const f = vi.fn<FetchLike>(async () => errRes(404));
    const p = fetchJson('https://x.test/a', { fetchImpl: f, sleep: noSleep });
    await expect(p).rejects.toBeInstanceOf(EspnHttpError);
    await expect(p).rejects.toMatchObject({ status: 404 });
    expect(f).toHaveBeenCalledTimes(1);
    expect(noSleep).not.toHaveBeenCalled();
  });

  it('retries on network errors', async () => {
    const f = vi.fn<FetchLike>().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(okRes([]));
    const r = await fetchJson('https://x.test/a', { fetchImpl: f, sleep: noSleep });
    expect(r.attempts).toBe(2);
  });

  it('times out after 10s by default and aborts the request', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const f = vi.fn<FetchLike>((_u, init) => {
      signal = init?.signal;
      return new Promise(() => {}); // never resolves
    });
    const p = fetchJson('https://x.test/slow', { fetchImpl: f, retries: 0 });
    const assertion = expect(p).rejects.toBeInstanceOf(EspnTimeoutError);
    await vi.advanceTimersByTimeAsync(9_999);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(signal?.aborted).toBe(true);
  });

  it('retries after a timeout', async () => {
    const f = vi.fn<FetchLike>().mockImplementationOnce(() => new Promise(() => {})).mockResolvedValueOnce(okRes({ late: true }));
    const r = await fetchJson('https://x.test/a', { fetchImpl: f, sleep: noSleep, timeoutMs: 10 });
    expect(r.data).toEqual({ late: true });
    expect(f).toHaveBeenCalledTimes(2);
  });
});
