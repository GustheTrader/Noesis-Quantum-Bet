import { describe, expect, it, vi } from 'vitest';
import {
  EspnReadError,
  dayRangeUtc,
  formatSpread,
  getEvents,
  getLatestOddsByEvent,
  readerConfigFromEnv,
  reduceSnapshots,
  todayIn,
  type ReaderConfig,
} from '../reader';

const ok = (data: unknown) => ({ ok: true, status: 200, json: async () => data });
const cfgWith = (fetchImpl: ReaderConfig['fetchImpl'], extra: Partial<ReaderConfig> = {}): ReaderConfig => ({
  url: 'http://127.0.0.1:8000/',
  anonKey: 'test-anon',
  fetchImpl,
  ...extra,
});

const snap = (o: Partial<Record<string, unknown>>) => ({
  event_id: '1',
  provider: 'DraftKings',
  spread: null,
  over_under: null,
  details: null,
  ml_home: null,
  ml_away: null,
  captured_at: '2026-11-03T10:00:00Z',
  ...o,
});

describe('readerConfigFromEnv', () => {
  it('reads VITE_ vars', () => {
    expect(readerConfigFromEnv({ VITE_SUPABASE_URL: 'http://x', VITE_SUPABASE_ANON_KEY: 'k' })).toEqual({ url: 'http://x', anonKey: 'k' });
  });
  it('throws a typed config error when missing', () => {
    try {
      readerConfigFromEnv({ VITE_SUPABASE_URL: 'http://x' });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(EspnReadError);
      expect((e as EspnReadError).kind).toBe('config');
    }
  });
  it('prefers VITE_ESPN_API_URL and needs no key for it', () => {
    expect(
      readerConfigFromEnv({ VITE_ESPN_API_URL: ' https://espn.example ', VITE_SUPABASE_URL: 'http://cloud', VITE_SUPABASE_ANON_KEY: 'k' }),
    ).toEqual({ url: 'https://espn.example', anonKey: '' });
    expect(readerConfigFromEnv({ VITE_ESPN_API_URL: 'https://espn.example', VITE_ESPN_ANON_KEY: 'ek' })).toEqual({
      url: 'https://espn.example',
      anonKey: 'ek',
    });
  });
  it('falls back to VITE_SUPABASE_URL when VITE_ESPN_API_URL is blank', () => {
    expect(readerConfigFromEnv({ VITE_ESPN_API_URL: '  ', VITE_SUPABASE_URL: 'http://x', VITE_SUPABASE_ANON_KEY: 'k' })).toEqual({
      url: 'http://x',
      anonKey: 'k',
    });
  });
});

describe('keyless reads (read-only proxy)', () => {
  it('sends no apikey/Authorization when anonKey is empty', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: { headers?: Record<string, string> }) => ok([]));
    await getEvents(cfgWith(fetchImpl, { url: 'https://espn.example', anonKey: '' }), { league: 'nfl', date: '2026-11-04' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url.startsWith('https://espn.example/rest/v1/events?')).toBe(true);
    expect(init?.headers).toEqual({ 'Accept-Profile': 'espn', Accept: 'application/json' });
  });
});

describe('dayRangeUtc / todayIn', () => {
  it('uses US Eastern day boundaries (EST, after DST ends)', () => {
    expect(dayRangeUtc('2026-11-04')).toEqual({ from: '2026-11-04T05:00:00.000Z', to: '2026-11-05T05:00:00.000Z' });
  });
  it('handles EDT and multi-day ranges', () => {
    expect(dayRangeUtc('2026-07-01', 2)).toEqual({ from: '2026-07-01T04:00:00.000Z', to: '2026-07-03T04:00:00.000Z' });
  });
  it('rejects bad dates', () => {
    expect(() => dayRangeUtc('11/04/2026')).toThrow(EspnReadError);
  });
  it('todayIn uses the zone, not UTC', () => {
    expect(todayIn('America/New_York', new Date('2026-11-05T03:30:00Z'))).toBe('2026-11-04');
  });
});

describe('getEvents', () => {
  it('sends espn profile + apikey headers and builds the PostgREST query', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: { headers?: Record<string, string> }) =>
      ok([
        {
          espn_id: '401',
          league: 'nba',
          name: 'Charlotte Hornets at Boston Celtics',
          short_name: 'CHA @ BOS',
          start_time: '2026-11-05T00:00:00+00:00',
          status_state: 'pre',
          status_detail: '11/4 - 7:00 PM EST',
          completed: false,
          updated_at: '2026-11-03T16:00:00+00:00',
          event_competitors: [
            { home_away: 'away', abbreviation: 'CHA', display_name: 'Charlotte Hornets', logo: 'a.png', score: null, winner: null },
            { home_away: 'home', abbreviation: 'BOS', display_name: 'Boston Celtics', logo: 'h.png', score: '101', winner: null },
          ],
        },
      ]),
    );
    const events = await getEvents(cfgWith(fetchImpl), { league: 'nba', date: '2026-11-04' });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(init?.headers).toMatchObject({ 'Accept-Profile': 'espn', apikey: 'test-anon', Authorization: 'Bearer test-anon' });
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe('http://127.0.0.1:8000/rest/v1/events');
    expect(u.searchParams.get('league')).toBe('eq.nba');
    expect(u.searchParams.getAll('start_time')).toEqual(['gte.2026-11-04T05:00:00.000Z', 'lt.2026-11-05T05:00:00.000Z']);
    expect(u.searchParams.get('select')).toContain('event_competitors(');
    expect(u.searchParams.get('select')).not.toContain('raw');
    expect(u.searchParams.get('order')).toBe('start_time.asc,espn_id.asc');

    expect(events).toHaveLength(1);
    expect(events[0].home?.abbreviation).toBe('BOS');
    expect(events[0].home?.score).toBe(101);
    expect(events[0].away?.abbreviation).toBe('CHA');
    expect(events[0]).not.toHaveProperty('event_competitors');
  });

  it('paginates when a full page comes back', async () => {
    const page = (n: number, start: number) => Array.from({ length: n }, (_, i) => ({ espn_id: String(start + i), event_competitors: [] }));
    const fetchImpl = vi.fn().mockResolvedValueOnce(ok(page(2, 0))).mockResolvedValueOnce(ok(page(1, 2)));
    const events = await getEvents(cfgWith(fetchImpl, { pageSize: 2 }), { league: 'nfl', date: '2026-11-01' });
    expect(events.map((e) => e.espn_id)).toEqual(['0', '1', '2']);
    expect(new URL(fetchImpl.mock.calls[1][0]).searchParams.get('offset')).toBe('2');
  });

  it('maps failures to typed errors', async () => {
    await expect(getEvents(cfgWith(async () => ({ ok: false, status: 406, json: async () => ({}) })), { league: 'nba', date: '2026-11-04' })).rejects.toMatchObject({
      name: 'EspnReadError',
      kind: 'http',
      status: 406,
    });
    await expect(getEvents(cfgWith(async () => { throw new TypeError('Failed to fetch'); }), { league: 'nba', date: '2026-11-04' })).rejects.toMatchObject({ kind: 'network' });
    await expect(getEvents(cfgWith(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('x'); } })), { league: 'nba', date: '2026-11-04' })).rejects.toMatchObject({ kind: 'parse' });
    await expect(getEvents(cfgWith(async () => ok({ message: 'nope' })), { league: 'nba', date: '2026-11-04' })).rejects.toMatchObject({ kind: 'parse' });
  });
});

describe('getLatestOddsByEvent', () => {
  it('returns {} without a request for no ids', async () => {
    const fetchImpl = vi.fn();
    expect(await getLatestOddsByEvent(cfgWith(fetchImpl), [])).toEqual({});
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('queries odds_snapshots with an in() filter and espn profile', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: { headers?: Record<string, string> }) => ok([]));
    await getLatestOddsByEvent(cfgWith(fetchImpl), ['401', '402', '401']);
    const [url, init] = fetchImpl.mock.calls[0];
    const u = new URL(url);
    expect(u.pathname).toBe('/rest/v1/odds_snapshots');
    expect(u.searchParams.get('event_id')).toBe('in.("401","402")');
    expect(u.searchParams.get('order')).toBe('event_id.asc,provider.asc,captured_at.asc,id.asc');
    expect(init?.headers?.['Accept-Profile']).toBe('espn');
    expect(init?.headers?.apikey).toBe('test-anon');
  });

  it('picks opening (first) and latest snapshot per event per provider', async () => {
    const rows = [
      snap({ spread: 2.5, details: 'CHA -2.5', ml_home: 115, ml_away: -136, over_under: 214.5, captured_at: '2026-11-03T12:00:00Z' }),
      snap({ spread: 1.5, details: 'CHA -1.5', ml_home: 105, ml_away: -125, over_under: 213, captured_at: '2026-11-03T08:00:00Z' }),
      snap({ provider: 'ESPN BET', spread: 3, captured_at: '2026-11-03T09:00:00Z' }),
      snap({ event_id: '2', spread: -1.5, captured_at: '2026-11-03T09:00:00Z' }),
    ];
    const out = await getLatestOddsByEvent(cfgWith(async () => ok(rows)), ['1', '2']);
    expect(Object.keys(out).sort()).toEqual(['1', '2']);
    const dk = out['1'].find((p) => p.provider === 'DraftKings')!;
    expect(dk.snapshotCount).toBe(2);
    expect(dk.opening.spreadHome).toBe(1.5);
    expect(dk.opening.capturedAt).toBe('2026-11-03T08:00:00Z');
    expect(dk.latest.spreadHome).toBe(2.5);
    expect(dk.latest.overUnder).toBe(214.5);
    expect(dk.latest.capturedAt).toBe('2026-11-03T12:00:00Z');
    expect(out['1']).toHaveLength(2);
  });

  it('treats stored spread as home-side: "CHA -2.5" with CHA away => home +2.5, away -2.5', () => {
    const out = reduceSnapshots([snap({ spread: 2.5, details: 'CHA -2.5' })]);
    const line = out['1'][0].latest;
    expect(line.spreadHome).toBe(2.5);
    expect(line.spreadAway).toBe(-2.5);
    expect(formatSpread(line.spreadAway)).toBe('-2.5');
    expect(formatSpread(line.spreadHome)).toBe('+2.5');
  });

  it('handles pick-em and numeric strings from PostgREST numeric columns', () => {
    const line = reduceSnapshots([snap({ spread: '0', over_under: '6.5' })])['1'][0].latest;
    expect(line.spreadHome).toBe(0);
    expect(line.spreadAway).toBe(0);
    expect(formatSpread(line.spreadAway)).toBe('PK');
    expect(line.overUnder).toBe(6.5);
  });
});
