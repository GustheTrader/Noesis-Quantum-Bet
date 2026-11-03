import { describe, expect, it } from 'vitest';
import { MAX_LIMIT, RateLimiter, clientIp, corsHeaders, decide, rateKey, validateQuery } from '../proxy';

const proxied = (path: string, search = '', method = 'GET') => {
  const d = decide(method, path, search);
  if (d.kind !== 'proxy') throw new Error(`expected proxy, got ${JSON.stringify(d)}`);
  return d;
};
const status = (method: string, path: string, search = '') => {
  const d = decide(method, path, search);
  return d.kind === 'reject' ? d.status : d.kind;
};

// Exactly what lib/espn/reader.ts sends.
const READER_EVENTS =
  '?select=espn_id%2Cleague%2Cname%2Cshort_name%2Cstart_time%2Cstatus_state%2Cstatus_detail%2Ccompleted%2Cupdated_at%2Cevent_competitors%28home_away%2Cabbreviation%2Cdisplay_name%2Clogo%2Cscore%2Cwinner%29' +
  '&league=eq.nfl&start_time=gte.2026-11-03T05%3A00%3A00.000Z&start_time=lt.2026-11-04T05%3A00%3A00.000Z&order=start_time.asc%2Cespn_id.asc&limit=1000&offset=0';
const READER_ODDS =
  '?select=event_id%2Cprovider%2Cspread%2Cover_under%2Cdetails%2Cml_home%2Cml_away%2Ccaptured_at&event_id=in.%28%22401%22%2C%22402%22%29' +
  '&order=event_id.asc%2Cprovider.asc%2Ccaptured_at.asc%2Cid.asc&limit=1000&offset=1000';

describe('decide: paths and methods', () => {
  it('proxies the 3 allowed tables with fixed headers and no auth', () => {
    for (const t of ['events', 'event_competitors', 'odds_snapshots']) {
      const d = proxied(`/rest/v1/${t}`, '?select=*');
      expect(d.upstreamPath.startsWith(`/${t}?`)).toBe(true);
      expect(d.headers).toEqual({ Accept: 'application/json', 'Accept-Profile': 'espn' });
      expect(Object.keys(d.headers).map((k) => k.toLowerCase())).not.toContain('authorization');
    }
  });
  it('accepts the reader.ts queries unchanged', () => {
    expect(proxied('/rest/v1/events', READER_EVENTS).upstreamPath).toContain('league=eq.nfl');
    expect(proxied('/rest/v1/odds_snapshots', READER_ODDS).upstreamPath).toContain('offset=1000');
  });
  it('rejects ingest_runs, other tables, rpc, root, and other schemas', () => {
    for (const p of ['/rest/v1/ingest_runs', '/rest/v1/picks', '/rest/v1/users', '/rest/v1/rpc/forbid_mutation', '/rest/v1/', '/rest/v1', '/', '/auth/v1/user', '/storage/v1/object', '/pg/query'])
      expect(status('GET', p)).toBe(404);
  });
  it('rejects path traversal, encoding, case and trailing tricks', () => {
    for (const p of ['/rest/v1/../v1/ingest_runs', '/rest/v1/events/../ingest_runs', '/rest/v1/%65vents', '/rest/v1/events%2F..%2Fingest_runs', '/rest/v1//events', '/rest/v1/events/', '/REST/v1/events', '/rest/v1/Events', '/rest/v1/events;x', '//rest/v1/events'])
      expect(status('GET', p)).toBe(404);
  });
  it('rejects writes and unusual methods', () => {
    for (const m of ['POST', 'PATCH', 'PUT', 'DELETE', 'TRACE', 'CONNECT']) expect(status(m, '/rest/v1/events')).toBe(405);
  });
  it('HEAD is allowed, OPTIONS is preflight, /healthz is health', () => {
    expect(decide('HEAD', '/rest/v1/events', '').kind).toBe('proxy');
    expect(decide('OPTIONS', '/rest/v1/ingest_runs', '').kind).toBe('preflight');
    expect(decide('GET', '/healthz', '').kind).toBe('health');
  });
});

describe('validateQuery', () => {
  const q = (s: string) => validateQuery(s);
  it('caps limit and adds a default limit', () => {
    const a = q('limit=999999');
    expect(a.ok && new URLSearchParams(a.query).get('limit')).toBe(String(MAX_LIMIT));
    const b = q('select=espn_id');
    expect(b.ok && new URLSearchParams(b.query).get('limit')).toBe(String(MAX_LIMIT));
    const c = q('limit=5');
    expect(c.ok && new URLSearchParams(c.query).get('limit')).toBe('5');
  });
  it('rejects bad limit/offset and duplicates', () => {
    for (const s of ['limit=-1', 'limit=abc', 'offset=999999', 'limit=1&limit=2', 'select=a&select=b']) expect(q(s).ok).toBe(false);
  });
  it('allows the standard operators', () => {
    for (const s of ['league=eq.nfl', 'spread=neq.0', 'start_time=gte.2026-01-01', 'start_time=lt.2026-01-02', 'ml_home=gt.100', 'ml_away=lte.-100', 'espn_id=in.(1,2)', 'winner=is.null', 'event_competitors.home_away=eq.home'])
      expect(q(s).ok, s).toBe(true);
  });
  it('rejects other operators, logic trees, and bad keys', () => {
    for (const s of [
      'name=like.*a*', 'name=ilike.*a*', 'name=match.^a', 'name=fts.x', 'name=not.eq.x', 'league=nfl',
      'or=(league.eq.nfl,league.eq.nba)', 'and=(a.eq.1)', 'not.league=eq.nfl', 'event_competitors.or=(a.eq.1)',
      'on_conflict=espn_id', 'columns=a', 'League=eq.x', 'a.b.c=eq.1', 'ingest_runs.status=eq.error', 'winner=is.maybe', 'espn_id=in.1,2',
    ])
      expect(q(s).ok, s).toBe(false);
  });
  it('select: allows columns and espn embeds only', () => {
    expect(q('select=*,event_competitors(*)').ok).toBe(true);
    expect(q('select=espn_id,odds_snapshots(provider,spread)').ok).toBe(true);
    for (const s of [
      'select=*,ingest_runs(*)', 'select=*,picks(*)', 'select=espn_id::text', 'select=alias:espn_id', 'select=...event_competitors(*)',
      'select=count()', 'select=a(b(c))', 'select=a(', 'select=raw->>x', 'select=espn_id,auth.users(*)',
    ])
      expect(q(s).ok, s).toBe(false);
  });
  it('order: columns with direction only', () => {
    expect(q('order=start_time.desc.nullslast,espn_id').ok).toBe(true);
    for (const s of ['order=start_time.sideways', 'order=raw->x.asc', 'order=a.asc;drop']) expect(q(s).ok, s).toBe(false);
  });
  it('caps size and param count', () => {
    expect(q('league=eq.' + 'x'.repeat(5000)).ok).toBe(false);
    expect(q(Array.from({ length: 31 }, (_, i) => `c${i}=eq.1`).join('&')).ok).toBe(false);
  });
});

describe('cors', () => {
  it('any origin by default', () => {
    expect(corsHeaders('https://a.example', ['*'])['Access-Control-Allow-Origin']).toBe('*');
  });
  it('allowlist echoes only listed origins', () => {
    expect(corsHeaders('https://app.vercel.app', ['https://app.vercel.app'])['Access-Control-Allow-Origin']).toBe('https://app.vercel.app');
    expect(corsHeaders('https://evil.example', ['https://app.vercel.app'])['Access-Control-Allow-Origin']).toBeUndefined();
  });
  it('allows the headers the reader / supabase-js send, read-only methods only', () => {
    const h = corsHeaders(undefined, ['*']);
    expect(h['Access-Control-Allow-Headers']).toContain('accept-profile');
    expect(h['Access-Control-Allow-Headers']).toContain('apikey');
    expect(h['Access-Control-Allow-Methods']).toBe('GET, HEAD, OPTIONS');
  });
});

describe('RateLimiter / clientIp', () => {
  it('limits per key per window', () => {
    let t = 0;
    const rl = new RateLimiter(3, 60_000, () => t);
    expect([rl.check('a'), rl.check('a'), rl.check('a')]).toEqual([0, 0, 0]);
    expect(rl.check('a')).toBeGreaterThan(0);
    expect(rl.check('b')).toBe(0);
    t = 60_000;
    expect(rl.check('a')).toBe(0);
  });
  it('uses the right-most forwarded hop (client-supplied left entries are ignored)', () => {
    expect(clientIp('6.6.6.6, 1.2.3.4', '127.0.0.1')).toBe('1.2.3.4');
    expect(clientIp(undefined, '10.0.0.1')).toBe('10.0.0.1');
    expect(clientIp(undefined, '::ffff:127.0.0.1')).toBe('127.0.0.1');
  });
  it('buckets IPv6 by /64', () => {
    expect(rateKey('2a09:bac1:76c0:dd0::23c:a7')).toBe('2a09:bac1:76c0:dd0::/64');
    expect(rateKey('2a09:bac1:76c0:dd0:1:2:3:4')).toBe('2a09:bac1:76c0:dd0::/64');
    expect(rateKey('2001:db8::1')).toBe('2001:db8:0:0::/64');
    expect(rateKey('2001:0DB8:0000:0001::')).toBe('2001:db8:0:1::/64');
  });
});
