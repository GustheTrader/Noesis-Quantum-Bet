# Noesis Quantum Bet

Vite + React + TypeScript terminal (`pages/`, `components/`, `lib/`). Deployed on Vercel from `GustheTrader/Noesis-Quantum-Bet`, `main`. `npm run build` is `vite build`; `api/*.ts` files export `GET`/`POST` and become Vercel functions, with matching dev middleware in `vite.config.ts`.

## CFB (college football)

Two data sources, two jobs:

- **Scores and game state: ESPN** — `lib/cfb.ts` over `/api/cfb` (same-origin proxy in `api/cfb.ts`; ESPN sends no CORS headers). Only `scoreboard` and `summary` under `football/college-football` are allowed through.
  - Live season (`LIVE_SEASON`, August onward) = ESPN's undated `/scoreboard`, i.e. the current week only. ESPN has no season-wide pull mid-season, so `getSeasonGames(live)` routes to `getLiveWeek()`.
  - `2006` archive = bundled snapshot `src/assets/cfb/2006.json` (926 games, weeks + bowls), rebuilt by `node scripts/snapshotCfb.mjs --season <year>`.
  - Box scores (team stats, scoring plays, quarters) come from `summary?event=<id>` — the CFB "box score" drawer (`components/CfbArchiveDrawer.tsx`) is the only place a season archive is inspected.
- **Prices: Novig exchange** — `lib/novig.ts` over `/api/novig` (`api/novig.ts`). Only the unsigned `/v3/public/catalog/*` GETs (`markets`, `events`, `markets/<id>/book`) are proxied; nothing signed and no key reaches the browser.
  - Paper (`api.paper.novig.com`, the default, `NOVIG_HOST` overrides) markets both the live week and the 2006 slate, because paper replays seasons.
  - Contracts trade 0–1, so price = implied probability. `SIDE_BY_TYPE` maps `SPREAD` / `MONEY` / `TOTAL` / `SPREAD_1H` / `TOTAL_1H` / `TEAM_TOTAL`.
  - Event descriptions on the wire are often just the strike (`"IND +6.5"`, `"WEST FLORIDA @ UNA T37.5"`), so `NovigBoard` splits matchups from strike-only rows instead of assuming `"AWAY @ HOME"`.

Rule: never print an invented line for CFB. ESPN's free feed has no closing prices; a row without a Novig market says `NL`, and the 2006 archive is graded on final scores only.

## Routes to check after touching CFB

`/api/cfb?path=scoreboard`, `/api/novig?path=markets%3Fleague%3DNCAAF%26limit%3D2000` (note: league code is `NCAAF`), and the CFB tab of the odds board — live week, week chips, box score drawer, and the Novig exchange card.
