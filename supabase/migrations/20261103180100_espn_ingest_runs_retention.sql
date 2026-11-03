-- Slice 3 retention rule: keep 14 days of espn.ingest_runs (the poller writes ~8 rows/minute at most).
-- The poller (scripts/espn-poll.ts) runs this hourly. Touches only espn.ingest_runs; no other table.
delete from espn.ingest_runs where started_at < now() - interval '14 days';
