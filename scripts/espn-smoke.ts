/**
 * One-off end-to-end smoke ingestion (run with bun on a host that can reach Postgres).
 *   DATABASE_URL=postgres://... bun scripts/espn-smoke.ts nba nfl [YYYYMMDD]
 * Requires the `pg` package to be resolvable (not an app dependency).
 */
// @ts-ignore -- pg is intentionally not an app dependency; install it where the smoke script runs
import pg from 'pg';
import { createPgWriter, isLeagueKey, runScoreboardIngest, toEspnDate } from '../lib/espn';

const args = process.argv.slice(2);
const date = args.find((a) => /^\d{8}$/.test(a)) ?? toEspnDate(new Date());
const leagues = args.filter(isLeagueKey);
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const writer = createPgWriter(pool);
let failed = false;
for (const lg of leagues.length ? leagues : (['nba', 'nfl'] as const)) {
  try {
    const r = await runScoreboardIngest(lg, date, writer, { client: { headers: { 'User-Agent': 'quantumbets-espn-ingest/0.1' } } });
    console.log(lg, date, JSON.stringify(r));
  } catch (e) {
    failed = true;
    console.error(lg, date, 'FAILED', e instanceof Error ? e.message : e);
  }
}
await pool.end();
process.exit(failed ? 1 : 0);
