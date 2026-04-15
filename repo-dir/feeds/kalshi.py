"""
Kalshi API Client — REST + WebSocket + RSA-PSS Auth

Endpoints:
  REST:    https://trading-api.kalshi.com/trade-api/v2
  Demo:    https://demo-api.kalshi.co/trade-api/v2
  WS:      wss://trading-api.kalshi.com/trade-api/ws/v2
  Demo WS: wss://demo-api.kalshi.co/trade-api/ws/v2

Auth: RSA-PSS signed requests (timestamp + method + path)
Prices: Kalshi uses cents internally (65 = $0.65)
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import httpx
import websockets
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

log = logging.getLogger("copybot.kalshi")

# ─── Config ──────────────────────────────────────────────────────

PROD_BASE = "https://trading-api.kalshi.com/trade-api/v2"
DEMO_BASE = "https://demo-api.kalshi.co/trade-api/v2"
PROD_WS = "wss://trading-api.kalshi.com/trade-api/ws/v2"
DEMO_WS = "wss://demo-api.kalshi.co/trade-api/ws/v2"


# ─── Data Models ─────────────────────────────────────────────────

@dataclass
class KalshiMarket:
    """A Kalshi event contract."""
    ticker: str
    title: str
    status: str = "open"  # open | closed | settled
    yes_bid: Optional[int] = None  # cents
    yes_ask: Optional[int] = None
    no_bid: Optional[int] = None
    no_ask: Optional[int] = None
    volume: int = 0
    open_interest: int = 0
    expiration_time: Optional[str] = None
    event_ticker: Optional[str] = None
    metadata: dict = field(default_factory=dict)


@dataclass
class KalshiOrderBook:
    """Order book for a Kalshi market."""
    ticker: str
    yes: list[tuple[int, int]] = field(default_factory=list)  # (price_cents, quantity)
    no: list[tuple[int, int]] = field(default_factory=list)


@dataclass
class KalshiOrder:
    """An order to submit."""
    ticker: str
    side: str  # "yes" | "no"
    action: str  # "buy" | "sell"
    count: int  # number of contracts
    type: str = "limit"  # "limit" | "market"
    price: Optional[int] = None  # cents, required for limit orders
    client_order_id: Optional[str] = None


@dataclass
class KalshiOrderResult:
    """Result of order submission."""
    order_id: str
    status: str
    ticker: str
    side: str
    action: str
    count: int
    filled_count: int = 0
    avg_price: Optional[int] = None


@dataclass
class KalshiPosition:
    """Current position in a market."""
    ticker: str
    position: int  # positive = yes, negative = no
    yes_count: int = 0
    no_count: int = 0
    realized_pnl: int = 0  # cents
    fees_paid: int = 0


# ─── Auth ────────────────────────────────────────────────────────

class KalshiAuth:
    """RSA-PSS request signing for Kalshi API."""

    def __init__(self, key_id: str, private_key_pem: str):
        self.key_id = key_id
        self.private_key = serialization.load_pem_private_key(
            private_key_pem.encode(), password=None
        )

    def sign(self, method: str, path: str) -> dict:
        """Generate authenticated headers for a request."""
        timestamp = str(int(time.time() * 1000))
        message = f"{timestamp}{method}{path}".encode("utf-8")
        signature = self.private_key.sign(
            message,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH,
            ),
            hashes.SHA256(),
        )
        sig_b64 = base64.b64encode(signature).decode("utf-8")
        return {
            "KALSHI-ACCESS-KEY": self.key_id,
            "KALSHI-ACCESS-SIGNATURE": sig_b64,
            "KALSHI-ACCESS-TIMESTAMP": timestamp,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    @classmethod
    def from_file(cls, key_id: str, pem_path: str) -> "KalshiAuth":
        """Load private key from PEM file."""
        pem = Path(pem_path).read_text()
        return cls(key_id, pem)


# ─── Client ──────────────────────────────────────────────────────

class KalshiClient:
    """
    Full Kalshi API client with RSA-PSS auth.
    
    Usage:
        # Demo
        client = KalshiClient.demo(key_id, pem_path)
        
        # Production
        client = KalshiClient.prod(key_id, pem_path)
        
        # Unauthenticated (public data only)
        client = KalshiClient()
    """

    def __init__(
        self,
        auth: Optional[KalshiAuth] = None,
        base_url: str = PROD_BASE,
    ):
        self.auth = auth
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)

    @classmethod
    def demo(cls, key_id: str, pem_path: str) -> "KalshiClient":
        auth = KalshiAuth.from_file(key_id, pem_path)
        return cls(auth=auth, base_url=DEMO_BASE)

    @classmethod
    def prod(cls, key_id: str, pem_path: str) -> "KalshiClient":
        auth = KalshiAuth.from_file(key_id, pem_path)
        return cls(auth=auth, base_url=PROD_BASE)

    async def close(self):
        await self.client.aclose()

    def _headers(self, method: str, path: str) -> dict:
        if self.auth:
            return self.auth.sign(method, path)
        return {"Content-Type": "application/json", "Accept": "application/json"}

    async def _get(self, path: str, params: dict = None) -> dict:
        headers = self._headers("GET", path)
        resp = await self.client.get(
            f"{self.base_url}{path}", headers=headers, params=params
        )
        resp.raise_for_status()
        return resp.json()

    async def _post(self, path: str, data: dict = None) -> dict:
        headers = self._headers("POST", path)
        resp = await self.client.post(
            f"{self.base_url}{path}", headers=headers, json=data
        )
        resp.raise_for_status()
        return resp.json()

    async def _delete(self, path: str, data: dict = None) -> dict:
        headers = self._headers("DELETE", path)
        resp = await self.client.request(
            "DELETE", f"{self.base_url}{path}", headers=headers, json=data
        )
        resp.raise_for_status()
        return resp.json()

    # ── Exchange ──

    async def get_exchange_status(self) -> dict:
        """Check if exchange is open."""
        return await self._get("/exchange/status")

    # ── Markets ──

    async def get_markets(
        self,
        limit: int = 20,
        status: str = "open",
        series_ticker: Optional[str] = None,
        event_ticker: Optional[str] = None,
    ) -> list[KalshiMarket]:
        """List markets."""
        params = {"limit": limit, "status": status}
        if series_ticker:
            params["series_ticker"] = series_ticker
        if event_ticker:
            params["event_ticker"] = event_ticker

        data = await self._get("/markets", params=params)
        markets = []
        for m in data.get("markets", []):
            markets.append(KalshiMarket(
                ticker=m["ticker"],
                title=m.get("title", ""),
                status=m.get("status", "open"),
                yes_bid=m.get("yes_bid"),
                yes_ask=m.get("yes_ask"),
                no_bid=m.get("no_bid"),
                no_ask=m.get("no_ask"),
                volume=int(m.get("volume", 0)),
                open_interest=int(m.get("open_interest", 0)),
                expiration_time=m.get("expiration_time"),
                event_ticker=m.get("event_ticker"),
                metadata=m,
            ))
        return markets

    async def get_market(self, ticker: str) -> Optional[KalshiMarket]:
        """Get a single market."""
        data = await self._get(f"/markets/{ticker}")
        m = data.get("market")
        if not m:
            return None
        return KalshiMarket(
            ticker=m["ticker"],
            title=m.get("title", ""),
            status=m.get("status", "open"),
            yes_bid=m.get("yes_bid"),
            yes_ask=m.get("yes_ask"),
            no_bid=m.get("no_bid"),
            no_ask=m.get("no_ask"),
            volume=int(m.get("volume", 0)),
            open_interest=int(m.get("open_interest", 0)),
            expiration_time=m.get("expiration_time"),
            event_ticker=m.get("event_ticker"),
            metadata=m,
        )

    async def get_orderbook(self, ticker: str) -> KalshiOrderBook:
        """Get order book for a market."""
        data = await self._get(f"/markets/{ticker}/orderbook")
        book = data.get("orderbook", {})
        return KalshiOrderBook(
            ticker=ticker,
            yes=[(p, q) for p, q in book.get("yes", [])],
            no=[(p, q) for p, q in book.get("no", [])],
        )

    # ── Events ──

    async def get_events(
        self,
        limit: int = 20,
        status: str = "open",
        series_ticker: Optional[str] = None,
    ) -> list[dict]:
        """List events (groups of related markets)."""
        params = {"limit": limit, "status": status}
        if series_ticker:
            params["series_ticker"] = series_ticker
        return (await self._get("/events", params=params)).get("events", [])

    # ── Orders ──

    async def create_order(self, order: KalshiOrder) -> KalshiOrderResult:
        """Submit an order. Requires auth."""
        data = {
            "ticker": order.ticker,
            "side": order.side,
            "action": order.action,
            "count": order.count,
            "type": order.type,
        }
        if order.price is not None:
            data["price"] = order.price
        if order.client_order_id:
            data["client_order_id"] = order.client_order_id

        result = await self._post("/orders", data=data)
        r = result.get("order", result)
        return KalshiOrderResult(
            order_id=r.get("order_id", ""),
            status=r.get("status", "unknown"),
            ticker=r.get("ticker", order.ticker),
            side=r.get("side", order.side),
            action=r.get("action", order.action),
            count=r.get("count", order.count),
            filled_count=r.get("filled_count", 0),
            avg_price=r.get("avg_price"),
        )

    async def cancel_order(self, order_id: str, ticker: str) -> bool:
        """Cancel an open order. Requires auth."""
        try:
            await self._delete(f"/orders/{order_id}", data={"ticker": ticker})
            return True
        except Exception:
            return False

    async def get_open_orders(self, ticker: Optional[str] = None) -> list[dict]:
        """List open orders. Requires auth."""
        params = {}
        if ticker:
            params["ticker"] = ticker
        data = await self._get("/orders", params=params)
        return data.get("orders", [])

    # ── Positions ──

    async def get_positions(self, limit: int = 100) -> list[KalshiPosition]:
        """Get current positions. Requires auth."""
        data = await self._get("/positions", params={"limit": limit})
        positions = []
        for p in data.get("positions", []):
            positions.append(KalshiPosition(
                ticker=p.get("ticker", ""),
                position=int(p.get("position", 0)),
                yes_count=int(p.get("yes_count", 0)),
                no_count=int(p.get("no_count", 0)),
                realized_pnl=int(p.get("realized_pnl", 0)),
                fees_paid=int(p.get("fees_paid", 0)),
            ))
        return positions

    # ── Account ──

    async def get_balance(self) -> int:
        """Get account balance in cents. Requires auth."""
        data = await self._get("/balance")
        return int(data.get("balance", 0))

    # ── Helpers ──

    def cents_to_dollars(self, cents: int) -> float:
        return cents / 100.0

    def dollars_to_cents(self, dollars: float) -> int:
        return round(dollars * 100)


# ─── WebSocket Feed ──────────────────────────────────────────────

class KalshiWS:
    """
    WebSocket feed for real-time Kalshi data.
    
    Requires auth for private channels.
    """

    def __init__(
        self,
        auth: Optional[KalshiAuth] = None,
        demo: bool = False,
    ):
        self.auth = auth
        self.ws_url = DEMO_WS if demo else PROD_WS
        self._running = False

    async def connect(self, channels: list[str]) -> AsyncIterator[dict]:
        """
        Connect and subscribe to channels.
        
        Channels: "orderbook", "trade", "ticker", "market"
        """
        self._running = True

        async with websockets.connect(self.ws_url) as ws:
            # Authenticate if we have credentials
            if self.auth:
                timestamp = str(int(time.time() * 1000))
                msg = f"{timestamp}GET/trade-api/ws/v2".encode()
                sig = self.auth.private_key.sign(
                    msg,
                    padding.PSS(
                        mgf=padding.MGF1(hashes.SHA256()),
                        salt_length=padding.PSS.MAX_LENGTH,
                    ),
                    hashes.SHA256(),
                )
                auth_msg = {
                    "type": "auth",
                    "key_id": self.auth.key_id,
                    "signature": base64.b64encode(sig).decode(),
                    "timestamp": timestamp,
                }
                await ws.send(json.dumps(auth_msg))

            # Subscribe
            sub_msg = {
                "id": 1,
                "cmd": "subscribe",
                "params": {"channels": channels},
            }
            await ws.send(json.dumps(sub_msg))
            log.info(f"Subscribed to Kalshi channels: {channels}")

            async for message in ws:
                if not self._running:
                    break

                try:
                    data = json.loads(message)
                    yield data
                except json.JSONDecodeError:
                    continue

    def stop(self):
        self._running = False
