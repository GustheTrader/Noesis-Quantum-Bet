/**
 * espn-readonly-proxy: pure request policy (no I/O), shared by server.ts and the unit tests.
 *
 * Public, read-only window onto the espn odds tables in Zo's local PostgREST:
 *   GET|HEAD /rest/v1/{events|event_competitors|odds_snapshots}?<allowlisted PostgREST params>
 *   GET|HEAD /healthz
 *   OPTIONS  (CORS preflight)
 * Everything else is rejected. Client headers are never forwarded: upstream requests carry only
 * Accept + Accept-Profile: espn and NO Authorization, so PostgREST runs them as its anon role.
 */

export const ALLOWED_TABLES = ['events', 'event_competitors', 'odds_snapshots'] as const;
export type AllowedTable = (typeof ALLOWED_TABLES)[number];

/** Embeddable resources inside `select=` (FK-related espn tables only). */
const EMBEDDABLE = new Set<string>(ALLOWED_TABLES);
export const MAX_LIMIT = 1000;
export const MAX_OFFSET = 100_000;
export const MAX_QUERY_LENGTH = 4096;
export const MAX_VALUE_LENGTH = 2048;
export const MAX_PARAMS = 30;

/** PostgREST horizontal-filter operators we allow (no full-text, regex, like, or logical trees). */
export const ALLOWED_OPERATORS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is'] as const;

const IDENT = /^[a-z_][a-z0-9_]{0,62}$/;
/** filter key: column, or embedded.column (one level). */
const FILTER_KEY = /^[a-z_][a-z0-9_]{0,62}(\.[a-z_][a-z0-9_]{0,62})?$/;
const RESERVED_KEYS = new Set(['select', 'order', 'limit', 'offset']);
/** Logical/aggregate keys PostgREST would interpret specially; never allowed. */
const FORBIDDEN_KEYS = new Set(['or', 'and', 'not', 'on_conflict', 'columns']);
/** select: identifiers, commas, one level of parens for embeds, '*'. No casts (::), aliases (:), spreads (...), aggregates. */
const SELECT_RE = /^[a-z0-9_,()*]+$/;
/** order: col[.asc|.desc][.nullsfirst|.nullslast], comma-separated. */
const ORDER_ITEM = /^[a-z_][a-z0-9_]{0,62}(\.(asc|desc))?(\.(nullsfirst|nullslast))?$/;
const IS_VALUES = new Set(['null', 'true', 'false', 'unknown', 'not_null']);

export type Decision =
  | { kind: 'reject'; status: number; error: string }
  | { kind: 'preflight' }
  | { kind: 'health' }
  | { kind: 'proxy'; table: AllowedTable; upstreamPath: string; headers: Record<string, string> };

const reject = (status: number, error: string): Decision => ({ kind: 'reject', status, error });

function validateSelect(v: string): string | null {
  if (!SELECT_RE.test(v)) return 'select: only column names, commas, "*" and table(...) embeds are allowed';
  let depth = 0;
  for (const ch of v) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth < 0 || depth > 1) return 'select: unbalanced or nested embeds';
  }
  if (depth !== 0) return 'select: unbalanced embeds';
  // Every token that opens an embed must be an allowed espn table.
  for (const m of v.matchAll(/([a-z0-9_]*)\(/g)) {
    if (!EMBEDDABLE.has(m[1])) return `select: embed "${m[1]}" not allowed`;
  }
  for (const tok of v.split(/[,()]/)) {
    if (tok === '' || tok === '*') continue;
    if (!IDENT.test(tok)) return `select: bad column "${tok}"`;
  }
  return null;
}

function validateFilterValue(v: string): string | null {
  const dot = v.indexOf('.');
  if (dot < 0) return 'filter: expected <operator>.<value>';
  const op = v.slice(0, dot);
  const rest = v.slice(dot + 1);
  if (!(ALLOWED_OPERATORS as readonly string[]).includes(op)) return `filter: operator "${op}" not allowed`;
  if (op === 'is' && !IS_VALUES.has(rest)) return 'filter: is.<null|true|false|unknown|not_null> only';
  if (op === 'in' && !/^\(.*\)$/.test(rest)) return 'filter: in.(...) expected';
  return null;
}

/** Validate the query string; returns a normalized query (limit capped) or an error. */
export function validateQuery(search: string): { ok: true; query: string } | { ok: false; error: string } {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  if (raw.length > MAX_QUERY_LENGTH) return { ok: false, error: 'query too long' };
  const params = new URLSearchParams(raw);
  const out = new URLSearchParams();
  let n = 0;
  let hasLimit = false;
  const seen = new Set<string>();
  for (const [k, v] of params) {
    if (++n > MAX_PARAMS) return { ok: false, error: 'too many query params' };
    if (v.length > MAX_VALUE_LENGTH) return { ok: false, error: `param "${k}" too long` };
    if (FORBIDDEN_KEYS.has(k) || /(^|\.)(or|and|not)$/.test(k)) return { ok: false, error: `param "${k}" not allowed` };
    if (RESERVED_KEYS.has(k)) {
      if (seen.has(k)) return { ok: false, error: `duplicate "${k}"` };
      seen.add(k);
    }
    if (k === 'select') {
      const err = validateSelect(v);
      if (err) return { ok: false, error: err };
      out.append(k, v);
    } else if (k === 'order') {
      if (!v.split(',').every((p) => ORDER_ITEM.test(p))) return { ok: false, error: 'order: col[.asc|.desc][.nullsfirst|.nullslast] only' };
      out.append(k, v);
    } else if (k === 'limit') {
      if (!/^\d{1,7}$/.test(v)) return { ok: false, error: 'limit must be a non-negative integer' };
      out.append(k, String(Math.min(Number(v), MAX_LIMIT)));
      hasLimit = true;
    } else if (k === 'offset') {
      if (!/^\d{1,7}$/.test(v) || Number(v) > MAX_OFFSET) return { ok: false, error: `offset must be an integer <= ${MAX_OFFSET}` };
      out.append(k, v);
    } else {
      if (!FILTER_KEY.test(k)) return { ok: false, error: `param "${k}" not allowed` };
      const emb = k.includes('.') ? k.split('.')[0] : null;
      if (emb && !EMBEDDABLE.has(emb)) return { ok: false, error: `filter on "${emb}" not allowed` };
      const err = validateFilterValue(v);
      if (err) return { ok: false, error: err };
      out.append(k, v);
    }
  }
  if (!hasLimit) out.append('limit', String(MAX_LIMIT));
  return { ok: true, query: out.toString() };
}

/** Decide what to do with a request. `rawPath` is the path exactly as received (before any decoding). */
export function decide(method: string, rawPath: string, search: string): Decision {
  const m = method.toUpperCase();
  if (m === 'OPTIONS') return { kind: 'preflight' };
  if (m !== 'GET' && m !== 'HEAD') return reject(405, 'method not allowed (read-only)');
  // No encoded chars, dot segments, double slashes or trailing junk: exact match only.
  if (rawPath === '/healthz') return { kind: 'health' };
  const mm = /^\/rest\/v1\/([a-z_]+)$/.exec(rawPath);
  if (!mm) return reject(404, 'not found');
  const table = mm[1];
  if (!(ALLOWED_TABLES as readonly string[]).includes(table)) return reject(404, 'not found');
  const q = validateQuery(search);
  if (q.ok === false) return reject(400, q.error);
  return {
    kind: 'proxy',
    table: table as AllowedTable,
    upstreamPath: `/${table}?${q.query}`,
    // Fresh header set: nothing from the client (apikey/Authorization/Prefer/Range/Content-Profile...) is forwarded.
    headers: { Accept: 'application/json', 'Accept-Profile': 'espn' },
  };
}

/** Response headers we pass through from PostgREST; everything else is dropped. */
export const PASS_RESPONSE_HEADERS = ['content-type', 'content-range'] as const;

export function corsHeaders(origin: string | undefined, allowedOrigins: string[]): Record<string, string> {
  const allowAny = allowedOrigins.length === 0 || allowedOrigins.includes('*');
  const allow = allowAny ? '*' : origin && allowedOrigins.includes(origin) ? origin : '';
  const h: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'apikey, authorization, accept, accept-profile, content-type, x-client-info',
    'Access-Control-Expose-Headers': 'content-range',
    'Access-Control-Max-Age': '86400',
  };
  if (allow) h['Access-Control-Allow-Origin'] = allow;
  if (!allowAny) h['Vary'] = 'Origin';
  return h;
}

/** Fixed-window per-key rate limiter. */
export class RateLimiter {
  private hits = new Map<string, { start: number; count: number }>();
  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}
  /** Returns seconds to wait (0 = allowed). */
  check(key: string): number {
    const t = this.now();
    const e = this.hits.get(key);
    if (!e || t - e.start >= this.windowMs) {
      this.hits.set(key, { start: t, count: 1 });
      if (this.hits.size > 50_000) this.sweep(t);
      return 0;
    }
    e.count++;
    return e.count > this.max ? Math.ceil((e.start + this.windowMs - t) / 1000) : 0;
  }
  private sweep(t: number) {
    for (const [k, e] of this.hits) if (t - e.start >= this.windowMs) this.hits.delete(k);
  }
}

/** Client IP: the right-most X-Forwarded-For hop (added by Zo's edge), else the socket address. */
export function clientIp(xff: string | undefined, socketAddr: string | undefined): string {
  const hops = (xff ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return rateKey(hops[hops.length - 1] || socketAddr || 'unknown');
}

/** Rate-limit bucket: IPv4 as-is, IPv6 collapsed to its /64 (one subscriber typically owns a whole /64). */
export function rateKey(ip: string): string {
  const v = ip.replace(/^::ffff:/i, '');
  if (!v.includes(':')) return v;
  const [head, tail = ''] = v.split('::');
  const h = head ? head.split(':') : [];
  const t = tail ? tail.split(':') : [];
  const full = v.includes('::') ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t] : h;
  return full.slice(0, 4).map((x) => x.toLowerCase().replace(/^0+(?=.)/, '')).join(':') + '::/64';
}
