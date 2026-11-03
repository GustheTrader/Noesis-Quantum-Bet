/**
 * ESPN read layer (slice 2): reads the self-hosted Supabase `espn` schema through PostgREST.
 * Browser-safe: plain fetch, anon key only, no Node imports. Do not import `./index` from UI code
 * (it re-exports the Node-only pg writer); import this file directly.
 */
import type { LeagueKey } from './leagues';

export type ReaderFetch = (input: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text?(): Promise<string>;
}>;

export interface ReaderConfig {
  /** Supabase API base, e.g. http://127.0.0.1:8000 (no trailing /rest/v1). */
  url: string;
  anonKey: string;
  fetchImpl?: ReaderFetch;
  /** Rows per page (PostgREST max-rows on Zo is 1000). */
  pageSize?: number;
}

export type ReadErrorKind = 'config' | 'network' | 'http' | 'parse';

export class EspnReadError extends Error {
  constructor(
    public readonly kind: ReadErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'EspnReadError';
  }
}

// ---- row shapes returned by PostgREST ----

export interface CompetitorRead {
  home_away: 'home' | 'away' | null;
  abbreviation: string | null;
  display_name: string | null;
  logo: string | null;
  score: number | null;
  winner: boolean | null;
}

export interface EventRead {
  espn_id: string;
  league: string;
  name: string | null;
  short_name: string | null;
  start_time: string | null;
  status_state: string | null;
  status_detail: string | null;
  completed: boolean;
  updated_at: string | null;
  home: CompetitorRead | null;
  away: CompetitorRead | null;
}

/** One odds snapshot. `spreadHome` is from the HOME team's side (ESPN convention, as stored). */
export interface OddsLine {
  spreadHome: number | null;
  spreadAway: number | null;
  overUnder: number | null;
  mlHome: number | null;
  mlAway: number | null;
  details: string | null;
  capturedAt: string;
}

export interface ProviderOdds {
  provider: string;
  latest: OddsLine;
  /** First snapshot we captured for this event/provider (proxy for the opening line). */
  opening: OddsLine;
  snapshotCount: number;
}

export type OddsByEvent = Record<string, ProviderOdds[]>;

// ---- config ----

type EnvLike = Record<string, string | boolean | undefined>;

function viteEnv(): EnvLike {
  return ((import.meta as unknown as { env?: EnvLike }).env ?? {}) as EnvLike;
}

/** Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Throws EspnReadError('config') if missing. */
export function readerConfigFromEnv(env: EnvLike = viteEnv()): ReaderConfig {
  const url = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL.trim() : '';
  const anonKey = typeof env.VITE_SUPABASE_ANON_KEY === 'string' ? env.VITE_SUPABASE_ANON_KEY.trim() : '';
  if (!url || !anonKey) {
    throw new EspnReadError('config', 'Odds data source not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  }
  return { url, anonKey };
}

// ---- helpers ----

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function negate(n: number | null): number | null {
  return n === null ? null : n === 0 ? 0 : -n;
}

function tzOffsetMinutes(utcMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p = Object.fromEntries(dtf.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - utcMs) / 60000);
}

function zonedMidnightUtc(y: number, m: number, d: number, timeZone: string): number {
  const guess = Date.UTC(y, m - 1, d);
  const off = tzOffsetMinutes(guess, timeZone);
  let t = guess - off * 60000;
  const off2 = tzOffsetMinutes(t, timeZone);
  if (off2 !== off) t = guess - off2 * 60000;
  return t;
}

/**
 * UTC [from, to) range for calendar day(s) in `timeZone` (default US Eastern, matching ESPN's scoreboard days).
 * `date` is YYYY-MM-DD; `days` defaults to 1.
 */
export function dayRangeUtc(date: string, days = 1, timeZone = 'America/New_York'): { from: string; to: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new EspnReadError('config', `Invalid date "${date}" (expected YYYY-MM-DD)`);
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  return {
    from: new Date(zonedMidnightUtc(y, mo, d, timeZone)).toISOString(),
    to: new Date(zonedMidnightUtc(y, mo, d + days, timeZone)).toISOString(),
  };
}

/** Today's date (YYYY-MM-DD) in `timeZone`. */
export function todayIn(timeZone = 'America/New_York', now: Date = new Date()): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(now)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}

async function getRows<T>(cfg: ReaderConfig, table: string, params: [string, string][]): Promise<T[]> {
  const f: ReaderFetch = cfg.fetchImpl ?? ((input, init) => fetch(input, init));
  const base = cfg.url.replace(/\/+$/, '');
  const pageSize = cfg.pageSize ?? 1000;
  const headers = {
    apikey: cfg.anonKey,
    Authorization: `Bearer ${cfg.anonKey}`,
    'Accept-Profile': 'espn',
    Accept: 'application/json',
  };
  const out: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const qs = new URLSearchParams([...params, ['limit', String(pageSize)], ['offset', String(offset)]]);
    const url = `${base}/rest/v1/${table}?${qs.toString()}`;
    let res: Awaited<ReturnType<ReaderFetch>>;
    try {
      res = await f(url, { headers });
    } catch (e) {
      throw new EspnReadError('network', `Network error reading espn.${table}: ${(e as Error)?.message ?? e}`);
    }
    if (!res.ok) throw new EspnReadError('http', `HTTP ${res.status} reading espn.${table}`, res.status);
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new EspnReadError('parse', `Invalid JSON reading espn.${table}`, res.status);
    }
    if (!Array.isArray(body)) throw new EspnReadError('parse', `Unexpected response shape for espn.${table}`, res.status);
    out.push(...(body as T[]));
    if (body.length < pageSize) break;
  }
  return out;
}

// ---- public API ----

export interface GetEventsArgs {
  league: LeagueKey;
  /** YYYY-MM-DD calendar day in `timeZone` (default America/New_York). */
  date: string;
  /** Number of days starting at `date` (default 1). */
  days?: number;
  timeZone?: string;
}

const EVENT_SELECT =
  'espn_id,league,name,short_name,start_time,status_state,status_detail,completed,updated_at,' +
  'event_competitors(home_away,abbreviation,display_name,logo,score,winner)';

/** Events (with home/away competitors) for a league whose start_time falls on the given day(s). */
export async function getEvents(cfg: ReaderConfig, args: GetEventsArgs): Promise<EventRead[]> {
  const { from, to } = dayRangeUtc(args.date, args.days ?? 1, args.timeZone);
  type Raw = Omit<EventRead, 'home' | 'away'> & { event_competitors?: Array<Record<string, unknown>> | null };
  const rows = await getRows<Raw>(cfg, 'events', [
    ['select', EVENT_SELECT],
    ['league', `eq.${args.league}`],
    ['start_time', `gte.${from}`],
    ['start_time', `lt.${to}`],
    ['order', 'start_time.asc,espn_id.asc'],
  ]);
  return rows.map((r) => {
    const comps = (r.event_competitors ?? []).map(
      (c): CompetitorRead => ({
        home_away: c.home_away === 'home' || c.home_away === 'away' ? c.home_away : null,
        abbreviation: (c.abbreviation as string) ?? null,
        display_name: (c.display_name as string) ?? null,
        logo: (c.logo as string) ?? null,
        score: num(c.score),
        winner: typeof c.winner === 'boolean' ? c.winner : null,
      }),
    );
    const { event_competitors: _drop, ...ev } = r;
    void _drop;
    return {
      ...ev,
      espn_id: String(ev.espn_id),
      home: comps.find((c) => c.home_away === 'home') ?? null,
      away: comps.find((c) => c.home_away === 'away') ?? null,
    };
  });
}

interface SnapshotRaw {
  event_id: string;
  provider: string;
  spread: number | string | null;
  over_under: number | string | null;
  details: string | null;
  ml_home: number | null;
  ml_away: number | null;
  captured_at: string;
}

export function toOddsLine(r: SnapshotRaw): OddsLine {
  const spreadHome = num(r.spread);
  return {
    spreadHome,
    spreadAway: negate(spreadHome),
    overUnder: num(r.over_under),
    mlHome: num(r.ml_home),
    mlAway: num(r.ml_away),
    details: r.details ?? null,
    capturedAt: r.captured_at,
  };
}

/** Pure: reduce snapshots (any order) to latest + opening per event per provider. */
export function reduceSnapshots(rows: SnapshotRaw[]): OddsByEvent {
  const groups = new Map<string, SnapshotRaw[]>();
  for (const r of rows) {
    const key = `${r.event_id}\u0000${r.provider}`;
    const g = groups.get(key);
    if (g) g.push(r);
    else groups.set(key, [r]);
  }
  const out: OddsByEvent = {};
  for (const g of groups.values()) {
    g.sort((a, b) => Date.parse(a.captured_at) - Date.parse(b.captured_at));
    const first = g[0];
    const last = g[g.length - 1];
    (out[String(first.event_id)] ??= []).push({
      provider: first.provider,
      opening: toOddsLine(first),
      latest: toOddsLine(last),
      snapshotCount: g.length,
    });
  }
  for (const list of Object.values(out)) list.sort((a, b) => a.provider.localeCompare(b.provider));
  return out;
}

const IDS_PER_REQUEST = 100;

/** Latest and opening odds snapshot per event per provider. */
export async function getLatestOddsByEvent(cfg: ReaderConfig, eventIds: string[]): Promise<OddsByEvent> {
  const ids = [...new Set(eventIds.map(String))].filter(Boolean);
  if (ids.length === 0) return {};
  const rows: SnapshotRaw[] = [];
  for (let i = 0; i < ids.length; i += IDS_PER_REQUEST) {
    const chunk = ids.slice(i, i + IDS_PER_REQUEST);
    rows.push(
      ...(await getRows<SnapshotRaw>(cfg, 'odds_snapshots', [
        ['select', 'event_id,provider,spread,over_under,details,ml_home,ml_away,captured_at'],
        ['event_id', `in.(${chunk.map((id) => `"${id.replace(/"/g, '')}"`).join(',')})`],
        ['order', 'event_id.asc,provider.asc,captured_at.asc,id.asc'],
      ])),
    );
  }
  return reduceSnapshots(rows);
}

// ---- formatting ----

/** +2.5 / -2.5 / PK / '' for null. */
export function formatSpread(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '';
  if (n === 0) return 'PK';
  return n > 0 ? `+${n}` : `${n}`;
}

export function formatMoneyline(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '';
  return n > 0 ? `+${n}` : `${n}`;
}

export function formatTotal(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '';
  return n.toFixed(1);
}
