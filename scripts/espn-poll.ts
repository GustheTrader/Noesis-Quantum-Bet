/**
 * ESPN odds poller: one tick every 60s (today + tomorrow ET, nfl/nba/nhl/mlb), fanned out to every DB target.
 *
 * Targets (pluggable, no code change to add one):
 *   ESPN_DB_URLS   comma/newline-separated Postgres URLs (e.g. Zo local + hosted cloud). Falls back to DATABASE_URL.
 *   ESPN_DB_NAMES  optional comma-separated non-secret labels for logs (default: target1, target2, ...).
 * Password may be omitted from a URL and supplied via PGPASSWORD. Never log the URLs.
 * Other env: ESPN_POLL_INTERVAL_MS (default 60000), ESPN_LEAGUES (default nfl,nba,nhl,mlb), ESPN_POLL_ONCE=1.
 *   bun scripts/espn-poll.ts
 * Requires `pg` to be resolvable where it runs (not an app dependency).
 */
// @ts-ignore -- pg is intentionally not an app dependency
import pg from 'pg';
import { createPgWriter, createPollLoop, isLeagueKey, redact, runPollTick, summarizeTick, type LeagueKey, type NamedWriter } from '../lib/espn';

const RETENTION_SQL = `delete from espn.ingest_runs where started_at < now() - interval '14 days'`;
const RETENTION_EVERY_MS = 60 * 60 * 1000;

const urls = (process.env.ESPN_DB_URLS ?? process.env.DATABASE_URL ?? '')
  .split(/[\n,]/)
  .map((s) => s.trim())
  .filter(Boolean);
if (!urls.length) {
  console.error('espn-poll: no DB targets (set ESPN_DB_URLS or DATABASE_URL)');
  process.exit(2);
}
const names = (process.env.ESPN_DB_NAMES ?? '').split(',').map((s) => s.trim());
const leagues = (process.env.ESPN_LEAGUES ?? 'nfl,nba,nhl,mlb').split(',').map((s) => s.trim()).filter(isLeagueKey) as LeagueKey[];
const intervalMs = Number(process.env.ESPN_POLL_INTERVAL_MS ?? 60_000);

const pools = urls.map((connectionString) => {
  const pool = new pg.Pool({ connectionString, max: 2, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000 });
  pool.on('error', (e: Error) => console.error('espn-poll: pool error', redact(e.message)));
  return pool;
});
const writers: NamedWriter[] = pools.map((p, i) => ({ name: names[i] || `target${i + 1}`, writer: createPgWriter(p) }));

let lastRetention = 0;
async function retention() {
  if (Date.now() - lastRetention < RETENTION_EVERY_MS) return;
  lastRetention = Date.now();
  await Promise.all(
    pools.map((p, i) =>
      p.query(RETENTION_SQL).then(
        (r: { rowCount?: number }) => r.rowCount && console.log(`espn-poll: retention ${writers[i].name} deleted ${r.rowCount} ingest_runs`),
        (e: Error) => console.error(`espn-poll: retention ${writers[i].name} failed`, redact(e.message)),
      ),
    ),
  );
}

const loop = createPollLoop({
  intervalMs,
  tick: async () => {
    const s = await runPollTick({ writers, leagues, concurrency: 4 });
    console.log(summarizeTick(s));
    await retention().catch(() => undefined);
    return s;
  },
  onError: (e) => console.error('espn-poll: tick crashed', redact(e instanceof Error ? e.message : String(e))),
});

async function shutdown(sig: string) {
  console.log(`espn-poll: ${sig}, stopping`);
  loop.stop();
  const deadline = Date.now() + 30_000;
  while (loop.isRunning && Date.now() < deadline) await new Promise((r) => setTimeout(r, 200));
  await Promise.all(pools.map((p) => p.end().catch(() => undefined)));
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

console.log(`espn-poll: start targets=${writers.map((w) => w.name).join(',')} leagues=${leagues.join(',')} interval=${intervalMs}ms`);
if (process.env.ESPN_POLL_ONCE === '1') {
  await loop.runOnce();
  await Promise.all(pools.map((p) => p.end()));
} else {
  await loop.start();
}
