import type { EspnDbWriter, IngestRunRow } from './ingest';
import type { CompetitorRow, EventRow, OddsSnapshotRow } from './normalize';

/** Minimal query interface (compatible with node-postgres `Pool`/`Client`). Kept dependency-free. */
export interface Queryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: any[] }>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

function insertValues(rowCount: number, colCount: number, casts: string[] = []): string {
  const out: string[] = [];
  for (let r = 0; r < rowCount; r++) {
    const ph: string[] = [];
    for (let c = 0; c < colCount; c++) ph.push(`$${r * colCount + c + 1}${casts[c] ?? ''}`);
    out.push(`(${ph.join(',')})`);
  }
  return out.join(',');
}

const EVENT_COLS = ['espn_id', 'league', 'name', 'short_name', 'start_time', 'status_state', 'status_detail', 'completed', 'season', 'season_type', 'week', 'venue', 'raw'] as const;
const COMP_COLS = ['event_id', 'team_id', 'home_away', 'abbreviation', 'display_name', 'logo', 'score', 'winner'] as const;
const ODDS_COLS = ['event_id', 'provider', 'spread', 'over_under', 'details', 'ml_home', 'ml_away', 'captured_at'] as const;
const RUN_COLS = ['job', 'league', 'status', 'http_code', 'rows', 'error', 'started_at', 'finished_at'] as const;

/** Postgres implementation of EspnDbWriter targeting the `espn` schema. */
export function createPgWriter(db: Queryable): EspnDbWriter {
  return {
    async upsertEvents(rows: EventRow[]) {
      if (!rows.length) return;
      const casts = EVENT_COLS.map((c) => (c === 'raw' ? '::jsonb' : ''));
      const params = rows.flatMap((r) => EVENT_COLS.map((c) => (c === 'raw' ? JSON.stringify(r.raw) : r[c])));
      const updates = EVENT_COLS.filter((c) => c !== 'espn_id').map((c) => `${c} = excluded.${c}`).join(', ');
      await db.query(
        `insert into espn.events (${EVENT_COLS.join(',')}) values ${insertValues(rows.length, EVENT_COLS.length, casts)}
         on conflict (espn_id) do update set ${updates}, updated_at = now()`,
        params,
      );
    },
    async upsertCompetitors(rows: CompetitorRow[]) {
      if (!rows.length) return;
      const params = rows.flatMap((r) => COMP_COLS.map((c) => r[c]));
      const updates = COMP_COLS.filter((c) => c !== 'event_id' && c !== 'team_id').map((c) => `${c} = excluded.${c}`).join(', ');
      await db.query(
        `insert into espn.event_competitors (${COMP_COLS.join(',')}) values ${insertValues(rows.length, COMP_COLS.length)}
         on conflict (event_id, team_id) do update set ${updates}, updated_at = now()`,
        params,
      );
    },
    async latestOdds(eventIds: string[]) {
      const out = new Map<string, OddsSnapshotRow>();
      if (!eventIds.length) return out;
      const { rows } = await db.query(
        `select distinct on (event_id, provider) ${ODDS_COLS.join(',')}
           from espn.odds_snapshots where event_id = any($1::text[])
          order by event_id, provider, captured_at desc, id desc`,
        [eventIds],
      );
      for (const r of rows) out.set(`${r.event_id}|${r.provider}`, r as OddsSnapshotRow);
      return out;
    },
    async insertOdds(rows: OddsSnapshotRow[]) {
      if (!rows.length) return;
      const params = rows.flatMap((r) => ODDS_COLS.map((c) => r[c]));
      await db.query(`insert into espn.odds_snapshots (${ODDS_COLS.join(',')}) values ${insertValues(rows.length, ODDS_COLS.length)}`, params);
    },
    async insertIngestRun(row: IngestRunRow) {
      await db.query(`insert into espn.ingest_runs (${RUN_COLS.join(',')}) values ${insertValues(1, RUN_COLS.length)}`, RUN_COLS.map((c) => row[c]));
    },
  };
}
