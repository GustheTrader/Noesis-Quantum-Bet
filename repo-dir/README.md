# Copy Bot — 5-Layer Prediction Market Pipeline

A LangGraph-based arbitrage bot that finds edge between **Polymarket** and **Kalshi** prediction markets, executes trades through a 5-layer pipeline with conditional branching.

---

## Architecture

```
Polymarket WS → INGEST → GATES → FILTERS → AGENTS → EXECUTION → Kalshi
     ↓              ↓         ↓          ↓          ↓            ↓
  raw data      qualify   refine     decide      execute      filled
  (prices,      markets   signals    (edge,      orders       positions
   books,       (pass/    (score,    action,
   trades)      fail)     rank)      size)
```

## The 5 Layers

### Layer 1: INGEST (`feeds/`)

Data enters from two exchanges:

| Source | What | Auth |
|--------|------|------|
| **Polymarket** | Market prices, order books, trades | None (public) |
| **Kalshi** | Markets, order books, positions | RSA-PSS signed |
| **ESPN** | Scores, schedules | None (public) |
| **The Odds API** | Sportsbook odds for comparison | API key |

**Key files:**
- `feeds/polymarket.py` — REST + WebSocket + Sports feed
- `feeds/kalshi.py` — REST + WebSocket + RSA-PSS auth
- `feeds/pregame.py` — ESPN, The Odds API, Polymarket Gamma

**The edge:** Polymarket prices and Kalshi prices for the same event should converge. The spread between them is the opportunity.

---

### Layer 2: GATES (`gates/`)

Environment scan — qualify or reject markets before any strategy runs.

```
GateContext → [Gate₁] → [Gate₂] → [Gate₃] → PASS/FAIL
```

- **Gate** — abstract base class, implement `evaluate(ctx) -> GateResult`
- **GatePipeline** — runs context through a chain. ALL must pass. First fail = reject.
- **GateResult** — `PASS` | `FAIL` | `SKIP`

**Built-in gates:**

| Gate | Pre-game | In-play | Check |
|------|----------|---------|-------|
| liquidity_gate | ≥$1,000 | ≥$500 | Enough money in market |
| spread_gate | ≥1% | — | Minimum bid-ask spread |
| volume_gate | ≥100 | — | Trading activity |
| volatility_gate | — | ✓ | In-play volatility |

**Why:** No point running expensive analysis on illiquid markets. Kill early.

---

### Layer 3: FILTERS (`filters/`)

Signal refinement — score, rank, clean.

```
FilterSignal → [Filter₁] → [Filter₂] → scored signal (or killed)
```

- **FilterSignal** — `raw_edge` → `filtered_edge` + `confidence`
- **FilterChain** — runs filters sequentially. If `filtered_edge <= 0`, stop early.
- **Filters are composable** — add `noise_filter`, `confidence_filter`, `momentum_filter`

**Default filters:**

| Phase | Filters |
|-------|---------|
| pre_game | noise_filter, confidence_filter |
| in_play | noise_filter, momentum_filter |

**Scoring:**
- Pre-game: `spread × 0.5 + liquidity_score × 0.3 + volume_score × 0.2`
- In-play: `spread × 0.6 + volume_score × 0.4`

---

### Layer 4: AGENTS (`sme_agents/`)

Subject Matter Expert agents — domain-specific edge computation.

- **SMEAgent** — abstract base: `evaluate(MarketData) -> Signal | None`
- Each agent has a `domain` (sports, politics, crypto), `max_loss`, custom logic
- **AgentRegistry** — register/get/filter agents by name or domain

**Default agents:**

| Phase | Agents |
|-------|--------|
| pre_game | sports_sme, politics_sme |
| in_play | sports_sme |

**Decision flow:**
```
MarketData → spread check → action (buy/sell) → size calc → confidence → Signal
```

- Spread < 2% → no edge, return None
- Polymarket > Kalshi → buy (edge = spread)
- Kalshi > Polymarket → sell (edge = spread)
- Size = min(liquidity × 10%, $100) × (edge / 0.1)
- Confidence = min(spread × 10, 1.0)

---

### Layer 5: EXECUTION (`execution/`)

Order management and Kalshi API integration.

- **ExecutionEngine** — abstract: `submit`, `cancel`, `get_position`, `get_balance`
- **Order** — market_id, side, size, price, status
- **Position** — market_id, size, avg_price, realized/unrealized PnL
- **OrderStatus** — PENDING → FILLED | PARTIAL | CANCELLED | FAILED

**Kalshi client handles:**
- `create_order()` → KalshiOrderResult
- `cancel_order()` → bool
- `get_positions()` → list[positions]
- `get_balance()` → cents

---

## Phase System (`phases/`)

Two modes triggered by cron:

| Phase | Gates | Filters | Agents | Max Exposure |
|-------|-------|---------|--------|-------------|
| pre_game | liquidity, volume, spread | noise, confidence | sports, politics | $10,000 |
| in_play | liquidity, volatility | noise, momentum | sports | $5,000 |

**PhaseManager** is a state machine:
- `register_config()` — load phase configs
- `transition(to_phase, trigger)` — switch modes
- `on_transition(callback)` — react to phase changes

**Flow:** pre_game → (cron) → in_play → (cron) → closed

---

## Conditional Routing

The pipeline has conditional branching at each layer:

```
ingest → gates → (check) → filters → (check) → agents → (check) → execution → END
              ↓ no signals           ↓ no signals            ↓ no decisions
             END                    END                      END
```

- No signals pass gates → END (skip expensive computation)
- No signals survive filters → END (no quality signal)
- No decisions from agents → END (no edge found)
- Decisions → execute → END

---

## Project Structure

```
copy-bot/
├── main.py              ← Orchestrator (CopyBot class)
├── graph.py             ← 5-layer LangGraph pipeline
├── smoke_test.py        ← Tests
├── config/
│   └── defaults.yaml    ← Phase configs, API endpoints
├── phases/
│   └── __init__.py      ← Phase state machine
├── gates/
│   └── __init__.py      ← Gate framework
├── filters/
│   └── __init__.py      ← Signal quality scoring
├── sme_agents/
│   └── __init__.py      ← Domain-specific agents
├── execution/
│   └── __init__.py      ← Order management + Kalshi
└── feeds/
    ├── polymarket.py    ← Polymarket REST + WS + Sports
    ├── kalshi.py        ← Kalshi REST + WS + RSA-PSS auth
    └── pregame.py       ← ESPN, Odds API, Gamma
```

---

## Configuration (`config/defaults.yaml`)

```yaml
phases:
  pre_game:
    gates: [liquidity_gate, volume_gate, spread_gate]
    filters: [noise_filter, confidence_filter]
    agents: [sports_sme, politics_sme]
    max_exposure: 10000.0

  in_play:
    gates: [liquidity_gate, volatility_gate]
    filters: [noise_filter, momentum_filter]
    agents: [sports_sme]
    max_exposure: 5000.0

kalshi:
  base_url: "https://api.elections.kalshi.com/trade-api/v2"

polymarket:
  websocket_url: "wss://ws-subscriptions-clob.polymarket.com"
```

---

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Set Kalshi credentials (optional — needed for execution)
export KALSHI_API_KEY="your_key"
export KALSHI_API_SECRET="your_secret"

# Run the pipeline
python main.py

# Run smoke test
python smoke_test.py

# Run LangGraph pipeline directly
python graph.py
```

---

## TODO

| Component | Status |
|-----------|--------|
| Data models | ✅ Complete |
| Phase system | ✅ Complete |
| Gate framework | ✅ Complete |
| Filter framework | ✅ Complete |
| Agent framework | ✅ Complete |
| Execution framework | ✅ Complete |
| Polymarket REST + WS | ✅ Complete |
| Kalshi REST + WS + Auth | ✅ Complete |
| ESPN + Odds API feeds | ✅ Complete |
| LangGraph pipeline | ✅ Complete |
| Gate implementations | ⚠️ Framework ready, add concrete gates |
| Filter implementations | ⚠️ Framework ready, add concrete filters |
| SME Agent logic | ⚠️ Stub ready, add domain-specific edge |
| Kalshi execution | ⚠️ API wired, needs live testing |

---

## License

Private — Jeff Gus
