# espn-readonly-proxy

Public, keyless, read-only access to exactly three tables of Zo's self-hosted `espn` schema
(`events`, `event_competitors`, `odds_snapshots`) for the Vercel app (`lib/espn/reader.ts`).

```
browser ──https──> herb.zo.space/api/espn/rest/v1/<table>   (zo.space API routes, zo-space/*.ts; thin forwarders)
          ──http──> 127.0.0.1:8790  server.ts + proxy.ts    (Zo process service "espn-readonly", svc_t_tNW1DddjU)
          ──http──> 127.0.0.1:3300  PostgREST, no Authorization => anon role, Accept-Profile: espn
```

- `proxy.ts`: pure policy (unit tested in `__tests__/`). Exact path allowlist, GET/HEAD only (else 405),
  query validation (eq/neq/gt/gte/lt/lte/in/is; no or/and/not; select embeds limited to the 3 tables;
  limit capped at 1000, offset at 100000), fresh upstream headers (client apikey/Authorization/Prefer/Range
  are ignored), CORS, a per-IP rate limiter (IPv6 per /64).
- `server.ts`: node:http server (runs under bun). 120 req/min/IP plus a 3000 req/min global backstop.
  Upstream error bodies are not passed through. Logs only `time method path status ms`.
- No key or secret is stored anywhere. PostgREST grants already deny anon on `espn.ingest_runs`.

Why zo.space instead of a public user service: the Zo Basic plan's 5 hosted HTTP services are all in use.

Deploy (Zo): copy `proxy.ts` + `server.ts` to `/home/workspace/Projects/espn-ingest/services/espn-readonly-proxy/`,
restart service `espn-readonly`. Write each `zo-space/<table>.ts` to the route `/api/espn/rest/v1/<table>` (api, public).

App config: `VITE_ESPN_API_URL=https://herb.zo.space/api/espn` (no key needed).
