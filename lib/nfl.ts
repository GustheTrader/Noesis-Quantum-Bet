// ESPN scoreboards are read through our own /api/espn proxy: ESPN sends no CORS header, and
// the Zo-hosted endpoint this used to call rejected browser origins outright, so every NFL
// surface failed with "Failed to fetch".
export const ESPN_PROXY = '/api/espn?path=';
export const NFL_ESPN_PATH = 'football/nfl';
export const NFL_FUTURE_SKEW_MS = 60_000;

export type NflTeam = { abbr: string; name: string; score: number; logo: string | null };
export type NflGame = {
  event_id: string;
  kickoff: string | null;
  state: 'pre' | 'in' | 'post' | 'unknown';
  detail: string;
  clock: string | null;
  period: number | null;
  home: NflTeam;
  away: NflTeam;
};
export type NflBoard = {
  source: 'espn';
  sport: 'nfl';
  fetched_at: string;
  freshness_seconds: number;
  games: NflGame[];
};
export type NflModelPrediction = {
  event_id: string;
  home_win_prob: number;
  model: string;
  version: string;
  as_of: string;
  generated_at: string;
  age_seconds: number;
  max_age_seconds: number;
};
export type NflModelStatus =
  | { status: 'unavailable'; reason: 'no_running_nfl_model' | 'no_valid_predictions' | 'no_espn_event_ids'; predictions: []; rejected?: { event_id: string; reason: string }[] }
  | { status: 'ok'; predictions: NflModelPrediction[]; rejected: { event_id: string; reason: string }[]; max_age_seconds: number };

export const NO_MODEL_UNAVAILABLE = { status: 'unavailable', reason: 'no_running_nfl_model', predictions: [] } as const;

export function isEspnEventId(value: unknown): value is string {
  return typeof value === 'string' && /^\d{1,12}$/.test(value);
}

export function freshnessSeconds(fetchedAt: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(fetchedAt)) / 1000));
}

function team(comp: any): NflTeam {
  const t = comp?.team ?? {};
  return {
    abbr: String(t.abbreviation ?? t.shortDisplayName ?? '').slice(0, 8),
    name: String(t.displayName ?? t.name ?? ''),
    score: Number(comp?.score ?? 0),
    logo: typeof t.logo === 'string' ? t.logo : null,
  };
}

export function parseNflScoreboard(json: any, now: Date): NflBoard {
  if (!json || !Array.isArray(json.events)) throw new Error('invalid_payload');
  if (json.events.length === 0) throw new Error('empty_payload');
  const games: NflGame[] = [];
  for (const ev of json.events) {
    const comp = ev?.competitions?.[0];
    const home = comp?.competitors?.find((c: any) => c?.homeAway === 'home');
    const away = comp?.competitors?.find((c: any) => c?.homeAway === 'away');
    if (!isEspnEventId(String(ev?.id ?? '')) || !home || !away) continue;
    const st = ev.status ?? {};
    const state = st.type?.state;
    games.push({
      event_id: String(ev.id),
      kickoff: typeof ev.date === 'string' ? ev.date : null,
      state: state === 'pre' || state === 'in' || state === 'post' ? state : 'unknown',
      detail: String(st.type?.detail ?? st.type?.description ?? ''),
      clock: st.displayClock ?? null,
      period: typeof st.period === 'number' ? st.period : null,
      home: team(home),
      away: team(away),
    });
  }
  const fetched_at = now.toISOString();
  return { source: 'espn', sport: 'nfl', fetched_at, freshness_seconds: 0, games };
}

export function validateModelPredictions(
  payload: any,
  opts: { now: Date; maxAgeSeconds: number; knownEventIds: Set<string> },
): NflModelStatus {
  if (!payload || !Array.isArray(payload.predictions)) return { ...NO_MODEL_UNAVAILABLE, predictions: [] };
  const rejected: { event_id: string; reason: string }[] = [];
  const kept: NflModelPrediction[] = [];
  const now = opts.now.getTime();
  if (opts.knownEventIds.size === 0) return { status: 'unavailable', reason: 'no_espn_event_ids', predictions: [], rejected };
  const asOf = Date.parse(String(payload.as_of ?? ''));
  for (const row of payload.predictions) {
    const eid = String(row?.event_id ?? '');
    const p = row?.home_win_prob;
    const model = String(row?.model ?? payload.model ?? '').trim();
    const version = String(row?.version ?? payload.version ?? '').trim();
    const ts = Date.parse(String(row?.generated_at ?? payload.generated_at ?? ''));
    if (!opts.knownEventIds.has(eid)) { rejected.push({ event_id: eid, reason: 'unmatched_event_id' }); continue; }
    if (!model) { rejected.push({ event_id: eid, reason: 'missing_model' }); continue; }
    if (!version) { rejected.push({ event_id: eid, reason: 'missing_version' }); continue; }
    if (!Number.isFinite(asOf)) { rejected.push({ event_id: eid, reason: 'missing_as_of' }); continue; }
    if (asOf > now + NFL_FUTURE_SKEW_MS) { rejected.push({ event_id: eid, reason: 'future_as_of' }); continue; }
    if (now - asOf > opts.maxAgeSeconds * 1000) { rejected.push({ event_id: eid, reason: 'stale_as_of' }); continue; }
    if (typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > 1) { rejected.push({ event_id: eid, reason: 'probability_out_of_range' }); continue; }
    if (!Number.isFinite(ts)) { rejected.push({ event_id: eid, reason: 'missing_timestamp' }); continue; }
    if (ts > now + NFL_FUTURE_SKEW_MS) { rejected.push({ event_id: eid, reason: 'future_timestamp' }); continue; }
    if (now - ts > opts.maxAgeSeconds * 1000) { rejected.push({ event_id: eid, reason: 'stale' }); continue; }
    kept.push({
      event_id: eid,
      home_win_prob: p,
      model,
      version,
      as_of: new Date(asOf).toISOString(),
      generated_at: new Date(ts).toISOString(),
      age_seconds: Math.max(0, Math.floor((now - ts) / 1000)),
      max_age_seconds: opts.maxAgeSeconds,
    });
  }
  if (kept.length === 0) return { status: 'unavailable', reason: 'no_valid_predictions', predictions: [], rejected };
  return { status: 'ok', predictions: kept, rejected, max_age_seconds: opts.maxAgeSeconds };
}

export async function fetchJsonWithTimeout(url: string, timeoutMs = 8000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`http_${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchNflScoreboard(): Promise<NflBoard> {
  const json = await fetchJsonWithTimeout(`${ESPN_PROXY}${encodeURIComponent(`${NFL_ESPN_PATH}/scoreboard`)}`);
  return parseNflScoreboard(json, new Date());
}

export async function fetchNflEvent(eventId: string): Promise<any> {
  if (!isEspnEventId(eventId)) throw new Error('invalid_event_id');
  const json = await fetchJsonWithTimeout(
    `${ESPN_PROXY}${encodeURIComponent(`${NFL_ESPN_PATH}/summary?event=${eventId}`)}`
  );
  return json;
}

/** No NFL model service is wired up, so this reports that honestly instead of inventing one. */
export async function fetchNflModels(): Promise<NflModelStatus> {
  return NO_MODEL_UNAVAILABLE as NflModelStatus;
}

export function simulationAllowed(league: string): { allowed: boolean; reason: string | null } {
  if (league === 'NFL') return { allowed: false, reason: 'no_nfl_prop_feed' };
  return { allowed: true, reason: null };
}

export function upstreamHealth(opts: { lastOkAt: Date | null; now: Date; maxAgeSeconds: number }): 'ONLINE' | 'STALE' | 'UNAVAILABLE' {
  if (!opts.lastOkAt) return 'UNAVAILABLE';
  return opts.now.getTime() - opts.lastOkAt.getTime() <= opts.maxAgeSeconds * 1000 ? 'ONLINE' : 'STALE';
}

export function formatNflStatus(g: { state: string; detail: string; period?: number | null; clock?: string | null }): string {
  if (!g.detail) return 'Status unavailable';
  return g.detail;
}

export function footerProviderLabel(league: string): string | null {
  if (league !== 'NFL') return null;
  return 'Source: ESPN schedule & scores · prices: TheRundown (Pinnacle, Circa, DraftKings, FanDuel, Caesars) · NFL model: unavailable (no_running_nfl_model)';
}
