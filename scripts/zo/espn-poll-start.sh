#!/usr/bin/env bash
# Zo user-service entrypoint for the ESPN poller. Reads the DB password from the root-only Supabase .env
# at runtime (never stored in the service config, the repo, or logs).
# Extra targets (e.g. hosted cloud Supabase): put ESPN_EXTRA_DB_URLS / ESPN_EXTRA_DB_NAMES in the
# optional root-only file /etc/espn-ingest/targets.env; no code change needed.
set -euo pipefail
cd "$(dirname "$0")/../.."
PGPASSWORD="$(grep -m1 '^POSTGRES_PASSWORD=' /opt/supabase/project/.env | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"
export PGPASSWORD
ESPN_DB_URLS="postgres://postgres@127.0.0.1:5432/postgres"
ESPN_DB_NAMES="zo"
if [ -f /etc/espn-ingest/targets.env ]; then
  set -a; . /etc/espn-ingest/targets.env; set +a
  if [ -n "${ESPN_EXTRA_DB_URLS:-}" ]; then
    ESPN_DB_URLS="${ESPN_DB_URLS},${ESPN_EXTRA_DB_URLS}"
    ESPN_DB_NAMES="${ESPN_DB_NAMES},${ESPN_EXTRA_DB_NAMES:-}"
  fi
fi
export ESPN_DB_URLS ESPN_DB_NAMES
exec /usr/local/bin/bun scripts/espn-poll.ts
