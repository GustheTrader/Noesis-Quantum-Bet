-- ESPN ingestion, slice 1. Idempotent; touches only schema `espn`.
-- Reads: public (anon/authenticated) SELECT via RLS policy. Writes: service_role / postgres only.

create schema if not exists espn;

create table if not exists espn.events (
  espn_id       text primary key,
  league        text not null,
  name          text,
  short_name    text,
  start_time    timestamptz,
  status_state  text,          -- pre | in | post
  status_detail text,
  completed     boolean not null default false,
  season        integer,
  season_type   integer,
  week          integer,
  venue         text,
  raw           jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists events_league_start_idx on espn.events (league, start_time);

create table if not exists espn.event_competitors (
  event_id      text not null references espn.events (espn_id) on delete cascade,
  team_id       text not null,
  home_away     text check (home_away in ('home', 'away')),
  abbreviation  text,
  display_name  text,
  logo          text,
  score         numeric,
  winner        boolean,
  updated_at    timestamptz not null default now(),
  primary key (event_id, team_id)
);

-- Append-only: odds disappear from ESPN after the game, so each change is snapshotted.
create table if not exists espn.odds_snapshots (
  id           bigint generated always as identity primary key,
  event_id     text not null references espn.events (espn_id),
  provider     text not null,
  spread       numeric,
  over_under   numeric,
  details      text,
  ml_home      integer,
  ml_away      integer,
  captured_at  timestamptz not null default now()
);
create index if not exists odds_snapshots_event_provider_idx
  on espn.odds_snapshots (event_id, provider, captured_at desc);

create table if not exists espn.ingest_runs (
  id           bigint generated always as identity primary key,
  job          text not null,
  league       text,
  status       text not null check (status in ('success', 'error')),
  http_code    integer,
  rows         integer not null default 0,
  error        text,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);
create index if not exists ingest_runs_started_idx on espn.ingest_runs (started_at desc);

-- Enforce append-only on odds_snapshots.
create or replace function espn.forbid_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'espn.% is append-only', tg_table_name;
end $$;

drop trigger if exists odds_snapshots_append_only on espn.odds_snapshots;
create trigger odds_snapshots_append_only
  before update or delete on espn.odds_snapshots
  for each row execute function espn.forbid_mutation();

-- Privileges
grant usage on schema espn to anon, authenticated, service_role;
revoke all on all tables in schema espn from anon, authenticated;
grant select on all tables in schema espn to anon, authenticated;
grant all on all tables in schema espn to service_role;
grant usage, select on all sequences in schema espn to service_role;

-- RLS: public read-only; service_role bypasses RLS for writes.
alter table espn.events            enable row level security;
alter table espn.event_competitors enable row level security;
alter table espn.odds_snapshots    enable row level security;
alter table espn.ingest_runs       enable row level security;

do $$
declare t text;
begin
  foreach t in array array['events', 'event_competitors', 'odds_snapshots', 'ingest_runs'] loop
    if not exists (
      select 1 from pg_policies where schemaname = 'espn' and tablename = t and policyname = 'public_read'
    ) then
      execute format('create policy public_read on espn.%I for select to anon, authenticated using (true)', t);
    end if;
  end loop;
end $$;
