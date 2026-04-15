"""
Polymarket Data Feed — REST + WebSocket

Endpoints:
  REST:      https://clob.polymarket.com
  Gamma:     https://gamma-api.polymarket.com
  WebSocket: wss://ws-subscriptions-clob.polymarket.com/ws/market
  Sports WS: wss://sports-api.polymarket.com/ws
  RTDS:      wss://ws-live-data.polymarket.com
"""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass, field
from typing import AsyncIterator, Optional

import httpx
import websockets

log = logging.getLogger("copybot.polymarket")

# ─── Config ──────────────────────────────────────────────────────

CLOB_BASE = "https://clob.polymarket.com"
GAMMA_BASE = "https://gamma-api.polymarket.com"
DATA_BASE = "https://data-api.polymarket.com"
WS_MARKET = "wss://ws-subscriptions-clob.polymarket.com/ws/market"
WS_SPORTS = "wss://sports-api.polymarket.com/ws"
WS_RTDS = "wss://ws-live-data.polymarket.com"


# ─── Data Models ─────────────────────────────────────────────────

@dataclass
class Market:
    """A Polymarket market."""
    condition_id: str
    question: str
    description: str = ""
    category: str = ""
    end_date: Optional[str] = None
    active: bool = True
    closed: bool = False
    volume: float = 0.0
    liquidity: float = 0.0
    best_ask: Optional[float] = None
    best_bid: Optional[float] = None
    last_trade_price: Optional[float] = None
    tokens: list[dict] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


@dataclass
class OrderBook:
    """Order book snapshot."""
    asset_id: str
    bids: list[tuple[float, float]] = field(default_factory=list)  # (price, size)
    asks: list[tuple[float, float]] = field(default_factory=list)
    timestamp: Optional[str] = None


@dataclass
class Trade:
    """A trade execution."""
    asset_id: str
    side: str  # "BUY" | "SELL"
    price: float
    size: float
    timestamp: str = ""
    trade_id: str = ""


@dataclass
class PriceUpdate:
    """Real-time price update from websocket."""
    asset_id: str
    best_bid: Optional[float] = None
    best_ask: Optional[float] = None
    last_price: Optional[float] = None
    timestamp: str = ""


# ─── REST Client ─────────────────────────────────────────────────

class PolymarketREST:
    """REST client for Polymarket CLOB + Gamma APIs."""

    def __init__(self, timeout: float = 30.0):
        self.client = httpx.AsyncClient(timeout=timeout)

    async def close(self):
        await self.client.aclose()

    # ── Gamma API (public, no auth) ──

    async def get_markets(
        self,
        limit: int = 100,
        offset: int = 0,
        active: bool = True,
        closed: bool = False,
        category: Optional[str] = None,
        tag: Optional[str] = None,
    ) -> list[Market]:
        """Fetch markets from Gamma API."""
        params = {
            "limit": limit,
            "offset": offset,
            "active": str(active).lower(),
            "closed": str(closed).lower(),
        }
        if category:
            params["category"] = category
        if tag:
            params["tag"] = tag

        resp = await self.client.get(f"{GAMMA_BASE}/markets", params=params)
        resp.raise_for_status()
        data = resp.json()

        markets = []
        for m in data if isinstance(data, list) else data.get("data", []):
            markets.append(Market(
                condition_id=m.get("conditionId", ""),
                question=m.get("question", ""),
                description=m.get("description", ""),
                category=m.get("category", ""),
                end_date=m.get("endDate"),
                active=m.get("active", True),
                closed=m.get("closed", False),
                volume=float(m.get("volume", 0)),
                liquidity=float(m.get("liquidity", 0)),
                tokens=m.get("tokens", []),
                metadata=m,
            ))
        return markets

    async def get_market(self, condition_id: str) -> Optional[Market]:
        """Fetch a single market by condition ID."""
        resp = await self.client.get(f"{GAMMA_BASE}/markets/{condition_id}")
        if resp.status_code != 200:
            return None
        m = resp.json()
        return Market(
            condition_id=m.get("conditionId", ""),
            question=m.get("question", ""),
            description=m.get("description", ""),
            category=m.get("category", ""),
            end_date=m.get("endDate"),
            active=m.get("active", True),
            closed=m.get("closed", False),
            volume=float(m.get("volume", 0)),
            liquidity=float(m.get("liquidity", 0)),
            tokens=m.get("tokens", []),
            metadata=m,
        )

    # ── CLOB API (public market data) ──

    async def get_orderbook(self, token_id: str) -> OrderBook:
        """Fetch order book for a token."""
        resp = await self.client.get(
            f"{CLOB_BASE}/book",
            params={"token_id": token_id},
        )
        resp.raise_for_status()
        data = resp.json()

        bids = [(float(b[0]), float(b[1])) for b in data.get("bids", [])]
        asks = [(float(a[0]), float(a[1])) for a in data.get("asks", [])]

        return OrderBook(
            asset_id=token_id,
            bids=bids,
            asks=asks,
        )

    async def get_price(self, token_id: str, side: str = "buy") -> Optional[float]:
        """Get midprice or best bid/ask for a token."""
        resp = await self.client.get(
            f"{CLOB_BASE}/midpoint",
            params={"token_id": token_id},
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        return float(data.get("mid", 0))

    async def get_last_trade_price(self, token_id: str) -> Optional[float]:
        """Get last trade price for a token."""
        resp = await self.client.get(
            f"{CLOB_CLIENT}/last-trade-price",
            params={"token_id": token_id},
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        return float(data.get("price", 0))

    # ── Data API ──

    async def get_market_prices(self, condition_id: str) -> dict:
        """Get price history for a market."""
        resp = await self.client.get(
            f"{DATA_BASE}/prices",
            params={"market": condition_id, "interval": "max", "fidelity": 60},
        )
        if resp.status_code != 200:
            return {}
        return resp.json()


# ─── WebSocket Feed ──────────────────────────────────────────────

class PolymarketWS:
    """
    WebSocket feed for real-time market data.
    
    Channels:
      - market: orderbook, price changes, trades
      - sports: live game scores
    """

    def __init__(self, channel: str = "market"):
        self.channel = channel
        self._ws = None
        self._running = False

    def _ws_url(self) -> str:
        if self.channel == "sports":
            return WS_SPORTS
        return WS_MARKET

    async def connect(self, asset_ids: list[str], custom_features: bool = True):
        """Connect and subscribe to asset IDs."""
        self._running = True
        url = self._ws_url()

        async with websockets.connect(url) as ws:
            self._ws = ws

            # Subscribe
            sub_msg = {
                "assets_ids": asset_ids,
                "type": self.channel,
                "custom_feature_enabled": custom_features,
            }
            await ws.send(json.dumps(sub_msg))
            log.info(f"Subscribed to {len(asset_ids)} assets on {self.channel}")

            # Heartbeat + message loop
            async for message in ws:
                if not self._running:
                    break

                data = json.loads(message)
                yield data

                # Send heartbeat every cycle (server expects PING every 10s)
                await ws.send("PING")

    async def subscribe_more(self, asset_ids: list[str]):
        """Dynamically subscribe to additional assets."""
        if self._ws:
            msg = {
                "assets_ids": asset_ids,
                "operation": "subscribe",
                "custom_feature_enabled": True,
            }
            await self._ws.send(json.dumps(msg))

    async def unsubscribe(self, asset_ids: list[str]):
        """Unsubscribe from assets."""
        if self._ws:
            msg = {
                "assets_ids": asset_ids,
                "operation": "unsubscribe",
            }
            await self._ws.send(json.dumps(msg))

    def stop(self):
        self._running = False


# ─── Sports Feed ─────────────────────────────────────────────────

class PolymarketSportsWS:
    """
    Sports WebSocket — live game scores, periods, status.
    No subscription needed — connect and receive all active events.
    Server sends ping every 5s, respond with pong within 10s.
    """

    def __init__(self):
        self._running = False

    async def connect(self) -> AsyncIterator[dict]:
        self._running = True

        async with websockets.connect(WS_SPORTS) as ws:
            log.info("Connected to Polymarket Sports feed")

            async for message in ws:
                if not self._running:
                    break

                # Respond to server pings
                if message == "ping":
                    await ws.send("pong")
                    continue

                try:
                    data = json.loads(message)
                    yield data
                except json.JSONDecodeError:
                    continue

    def stop(self):
        self._running = False


# ─── Helpers ─────────────────────────────────────────────────────

async def fetch_active_markets(
    category: Optional[str] = None,
    limit: int = 100,
) -> list[Market]:
    """Quick helper to fetch active markets."""
    rest = PolymarketREST()
    try:
        markets = await rest.get_markets(limit=limit, active=True, category=category)
        return [m for m in markets if m.active and not m.closed]
    finally:
        await rest.close()


def parse_book_for_spread(book: OrderBook) -> Optional[float]:
    """Extract bid-ask spread from order book."""
    if not book.bids or not book.asks:
        return None
    best_bid = book.bids[0][0]
    best_ask = book.asks[0][0]
    return best_ask - best_bid
