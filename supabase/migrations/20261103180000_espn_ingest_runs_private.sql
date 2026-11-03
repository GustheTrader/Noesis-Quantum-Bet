-- Slice 3: espn.ingest_runs holds operational error text; hide it from the public API.
-- anon/authenticated lose SELECT (and the public_read policy); service_role/postgres keep full access.
-- NOTE: the slice-1 migration's blanket `grant select on all tables in schema espn to anon, authenticated`
-- would re-grant this if re-run; run this migration after it.
begin;
revoke all on table espn.ingest_runs from anon, authenticated;
drop policy if exists public_read on espn.ingest_runs;
grant all on table espn.ingest_runs to service_role;
commit;
