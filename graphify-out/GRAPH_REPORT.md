# Graph Report - noesis-quantum-bet  (2026-11-08)

## Corpus Check
- 75 files · ~87,473 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 782 nodes · 1437 edges · 43 communities (32 shown, 11 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9602ac55`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lib/cfb.ts
- graph.py
- pregame.py
- package.json
- nfl.ts
- testCfbFeeds.mjs
- react
- types.ts
- Picks.tsx
- KalshiClient
- App.tsx
- QuantumEdge.tsx
- phases/__init__.py
- StatsEdge.tsx
- in_play
- PolymarketREST
- feeds/__init__.py
- gates/__init__.py
- compilerOptions
- kalshi.py
- Admin.tsx
- execution/__init__.py
- KalshiAuth
- typing
- main.py
- Copy Bot — 5-Layer Prediction Market Pipeline
- League
- SMEAgent
- api/claude.ts
- WeekView.tsx
- PredictionMarkets.tsx
- PolymarketWS
- smoke_test.py
- .process_market
- TradingDesk.tsx
- VoiceAgent
- custom-images.d.ts
- GnoesisLogo.tsx
- .get_orderbook

## God Nodes (most connected - your core abstractions)
1. `react` - 38 edges
2. `lucide-react` - 33 edges
3. `League` - 30 edges
4. `clsx` - 26 edges
5. `KalshiClient` - 25 edges
6. `App()` - 21 edges
7. `WeekData` - 17 edges
8. `compilerOptions` - 16 edges
9. `PolymarketREST` - 14 edges
10. `getLiveWeek()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `ArchiveMatchup` --references--> `League`  [EXTRACTED]
  components/CfbArchiveDrawer.tsx → types.ts
- `LiveOddsProps` --references--> `League`  [EXTRACTED]
  components/LiveOdds.tsx → types.ts
- `MarketROIHeatmapProps` --references--> `WeekData`  [EXTRACTED]
  components/MarketROIHeatmap.tsx → types.ts
- `NavBarProps` --references--> `League`  [EXTRACTED]
  components/NavBar.tsx → types.ts
- `WeekViewProps` --references--> `WeekData`  [EXTRACTED]
  components/WeekView.tsx → types.ts

## Import Cycles
- None detected.

## Communities (43 total, 11 thin omitted)

### Community 0 - "lib/cfb.ts"
Cohesion: 0.05
Nodes (64): ArchiveMatchup, CfbArchiveDrawer(), CfbArchiveDrawerProps, quarterRows(), ChatBot(), Message, ARCHIVE_SEASON, availableWeeks() (+56 more)

### Community 1 - "graph.py"
Cohesion: 0.07
Nodes (24): Action, after_agents(), after_filters(), after_gates(), AgentDecision, agents_node(), BotState, build_graph() (+16 more)

### Community 2 - "pregame.py"
Cohesion: 0.05
Nodes (9): ESPNScores, Event, get_pregame_snapshot(), OddsSnapshot, PolymarketGamma, PreGameAggregator, PreGameContext, TheOddsAPI (+1 more)

### Community 3 - "package.json"
Cohesion: 0.06
Nodes (37): dependencies, @anthropic-ai/sdk@^1.1.0, clsx@^2.1.1, @google/genai@^1.30.0, lucide-react@^0.555.0, motion@^12.40.0, papaparse@^5.5.3, react@^19.2.0 (+29 more)

### Community 4 - "nfl.ts"
Cohesion: 0.10
Nodes (31): NflHealth, NflLiveBoard(), Play, fetchJsonWithTimeout(), fetchNflEvent(), fetchNflModels(), fetchNflScoreboard(), formatNflStatus() (+23 more)

### Community 5 - "testCfbFeeds.mjs"
Cohesion: 0.09
Nodes (22): args, clean, finished, games, LOGO(), out, outDir, season (+14 more)

### Community 6 - "react"
Cohesion: 0.12
Nodes (17): GameSummary, MOCK_GAMES, Play, OnboardingTour(), Step, TOUR_STEPS, TourProps, VoiceAgentProps (+9 more)

### Community 7 - "types.ts"
Cohesion: 0.16
Nodes (20): HighlightReel(), MarketROIHeatmap(), MarketROIHeatmapProps, MonthDetail, PerformanceChart(), PerformanceChartProps, ActivityIcon(), SummaryCards() (+12 more)

### Community 8 - "Picks.tsx"
Cohesion: 0.14
Nodes (22): CfbSlate(), cfbOddsFromGames(), estimateMoneyline(), GameOdd, getDeterministicEdge(), getMockOddsForLeague(), LEAGUE_MOCK_DATA, LiveOdds() (+14 more)

### Community 10 - "App.tsx"
Cohesion: 0.15
Nodes (17): App(), PremiumGate(), PremiumGateProps, APP_NAME, APP_VERSION, AUTHORIZED_ADMIN, INITIAL_ARCHIVE, INITIAL_GAME_SUMMARIES (+9 more)

### Community 11 - "QuantumEdge.tsx"
Cohesion: 0.20
Nodes (16): PipelineVisualizer(), SimulatedSignal, StageDefinition, STAGES, QuantumEdge(), evaluate_agent(), evaluate_gates(), liquidity_gate() (+8 more)

### Community 12 - "phases/__init__.py"
Cohesion: 0.14
Nodes (5): Phase, PhaseConfig, PhaseEvent, PhaseManager, Phase System (`phases/`)

### Community 13 - "StatsEdge.tsx"
Cohesion: 0.12
Nodes (13): EmailGate(), EmailGateProps, NavBar(), NavBarProps, supabase, SUPABASE_ANON_KEY, SUPABASE_URL, PAYOUT_MATRIX (+5 more)

### Community 14 - "in_play"
Cohesion: 0.11
Nodes (18): cron, in_play_to_closed, pre_game_to_in_play, agents, filters, gates, max_exposure, kalshi (+10 more)

### Community 15 - "PolymarketREST"
Cohesion: 0.14
Nodes (4): fetch_active_markets(), Market, PolymarketREST, test_polymarket()

### Community 16 - "feeds/__init__.py"
Cohesion: 0.13
Nodes (5): OrderBook, parse_book_for_spread(), PolymarketSportsWS, PriceUpdate, Trade

### Community 17 - "gates/__init__.py"
Cohesion: 0.16
Nodes (4): Gate, GateContext, GatePipeline, GateResult

### Community 18 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+9 more)

### Community 19 - "kalshi.py"
Cohesion: 0.13
Nodes (4): KalshiOrder, KalshiOrderResult, KalshiPosition, Layer 5: EXECUTION (`execution/`)

### Community 20 - "Admin.tsx"
Cohesion: 0.18
Nodes (13): MonthlyHeatmap(), MonthlyHeatmapProps, MONTHS_LIST, YEARS_LIST, Admin(), AdminProps, IngestType, PositionSubTab (+5 more)

### Community 21 - "execution/__init__.py"
Cohesion: 0.17
Nodes (4): ExecutionEngine, Order, OrderStatus, Position

### Community 23 - "typing"
Cohesion: 0.17
Nodes (3): Filter, FilterChain, FilterSignal

### Community 24 - "main.py"
Cohesion: 0.17
Nodes (3): Action, MarketData, Signal

### Community 25 - "Copy Bot — 5-Layer Prediction Market Pipeline"
Cohesion: 0.14
Nodes (13): Architecture, Conditional Routing, Configuration (`config/defaults.yaml`), Copy Bot — 5-Layer Prediction Market Pipeline, Layer 1: INGEST (`feeds/`), Layer 2: GATES (`gates/`), Layer 3: FILTERS (`filters/`), Layer 4: AGENTS (`sme_agents/`) (+5 more)

### Community 26 - "League"
Cohesion: 0.21
Nodes (9): HighlightReelProps, NewsItem, TEAM_LABELS, TEAMS, TeamTicker(), TeamTickerProps, Superposition(), SuperpositionProps (+1 more)

### Community 28 - "api/claude.ts"
Cohesion: 0.22
Nodes (10): ask(), ChatTurn, client, IMAGE_TYPES, ImageType, POST(), RESULTS_SCHEMA, run() (+2 more)

### Community 29 - "WeekView.tsx"
Cohesion: 0.22
Nodes (10): CountUp(), WeekCard(), WeekView(), WeekViewProps, Bet, BetResult, LOSS, PENDING (+2 more)

### Community 30 - "PredictionMarkets.tsx"
Cohesion: 0.20
Nodes (9): BinaryMarket, COMMENTARY_LIST, DECAY_DATA, generateMarketsForLeague(), INITIAL_WORLD_CUP_MARKETS, PredictionMarkets(), PredictionMarketsProps, WorldCupMarket (+1 more)

### Community 32 - "smoke_test.py"
Cohesion: 0.24
Nodes (3): main(), test_kalshi(), test_pregame_snapshot()

### Community 34 - "TradingDesk.tsx"
Cohesion: 0.40
Nodes (5): ChartViz(), MarketTicker, Trade, TradingDesk(), TradingDeskProps

### Community 35 - "VoiceAgent"
Cohesion: 0.50
Nodes (3): VoiceAgent(), createBlob(), encode()

### Community 36 - "custom-images.d.ts"
Cohesion: 0.40
Nodes (4): *.jpeg, *.jpg, *.png, *.svg

## Knowledge Gaps
- **4 isolated node(s):** `WIN`, `LOSS`, `VOID`, `PENDING`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 329 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `lib/cfb.ts`, `TradingDesk.tsx`, `package.json`, `nfl.ts`, `GnoesisLogo.tsx`, `types.ts`, `Picks.tsx`, `App.tsx`, `QuantumEdge.tsx`, `StatsEdge.tsx`, `Admin.tsx`, `League`, `WeekView.tsx`, `PredictionMarkets.tsx`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `WIN`, `LOSS`, `VOID` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lib/cfb.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05009009009009009 - nodes in this community are weakly interconnected._
- **Why does `KalshiClient` connect `KalshiClient` to `smoke_test.py`, `.get_orderbook`, `feeds/__init__.py`, `kalshi.py`, `KalshiAuth`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `graph.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06676342525399129 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `react` to `lib/cfb.ts`, `TradingDesk.tsx`, `package.json`, `nfl.ts`, `types.ts`, `Picks.tsx`, `App.tsx`, `QuantumEdge.tsx`, `StatsEdge.tsx`, `Admin.tsx`, `League`, `WeekView.tsx`, `PredictionMarkets.tsx`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Should `pregame.py` be split into smaller, more focused modules?**
  _Cohesion score 0.050980392156862744 - nodes in this community are weakly interconnected._