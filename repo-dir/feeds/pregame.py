"""
Pre-Game Data Sources — External data for pre-market analysis.

Sources:
  - Sports APIs (scores, schedules, odds)
  - News/sentiment feeds
  - Historical market data
  - Polymarket Gamma (market metadata, volume history)

All open source / free tier.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional

import httpx

log = logging.getLogger("copybot.pregame")


# ─── Data Models ─────────────────────────────────────────────────

@dataclass
class Event:
    """A pre-game event."""
    event_id: str
    sport: str  # "nfl" | "nba" | "soccer" | "politics" | etc.
    home_team: str
    away_team: str
    start_time: str
    status: str = "scheduled"  # scheduled | live | final
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    metadata: dict = field(default_factory=dict)


@dataclass
class OddsSnapshot:
    """Odds from an external source for comparison."""
    source: str
    market_id: str
    home_odds: float
    away_odds: float
    draw_odds: Optional[float] = None
    timestamp: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass
class PreGameContext:
    """Aggregated pre-game data for a market."""
    market_id: str
    event: Optional[Event] = None
    external_odds: list[OddsSnapshot] = field(default_factory=list)
    volume_history: list[dict] = field(default_factory=list)
    social_signals: dict = field(default_factory=dict)
    metadata: dict = field(default_factory=dict)

    @property
    def odds_consensus(self) -> Optional[float]:
        """Average implied probability across external sources."""
        if not self.external_odds:
            return None
        probs = [o.home_odds for o in self.external_odds]
        return sum(probs) / len(probs)


# ─── The Odds API (free tier: 500 req/month) ────────────────────

class TheOddsAPI:
    """
    The Odds API — aggregated sports odds from multiple bookmakers.
    https://the-odds-api.com
    
    Free tier: 500 requests/month
    Good for: comparing prediction market prices vs sportsbook odds.
    """

    BASE = "https://api.the-odds-api.com/v4"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = httpx.AsyncClient(timeout=15.0)

    async def close(self):
        await self.client.aclose()

    async def get_sports(self) -> list[dict]:
        """List available sports."""
        resp = await self.client.get(
            f"{self.BASE}/sports",
            params={"apiKey": self.api_key},
        )
        resp.raise_for_status()
        return resp.json()

    async def get_odds(
        self,
        sport: str = "americanfootball_nfl",
        regions: str = "us",
        markets: str = "h2h",
    ) -> list[dict]:
        """Get current odds for a sport."""
        resp = await self.client.get(
            f"{self.BASE}/sports/{sport}/odds",
            params={
                "apiKey": self.api_key,
                "regions": regions,
                "markets": markets,
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def get_scores(self, sport: str = "americanfootball_nfl") -> list[dict]:
        """Get live/final scores."""
        resp = await self.client.get(
            f"{self.BASE}/sports/{sport}/scores",
            params={"apiKey": self.api_key, "daysFrom": 3},
        )
        resp.raise_for_status()
        return resp.json()

    def parse_odds_to_probability(self, american_odds: int) -> float:
        """Convert American odds to implied probability."""
        if american_odds > 0:
            return 100 / (american_odds + 100)
        else:
            return abs(american_odds) / (abs(american_odds) + 100)


# ─── ESPN (public, no auth) ─────────────────────────────────────

class ESPNScores:
    """
    ESPN public API — scores and schedules.
    No API key needed.
    """

    BASE = "https://site.api.espn.com/apis/site/v2/sports"

    SPORTS = {
        "nfl": "football/nfl",
        "nba": "basketball/nba",
        "mlb": "baseball/mlb",
        "nhl": "hockey/nhl",
        "soccer": "soccer/eng.1",  # Premier League
        "college_football": "football/college-football",
        "college_basketball": "basketball/mens-college-basketball",
    }

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=15.0)

    async def close(self):
        await self.client.aclose()

    async def get_scoreboard(self, sport: str = "nfl") -> list[Event]:
        """Get current scoreboard for a sport."""
        path = self.SPORTS.get(sport, sport)
        resp = await self.client.get(f"{self.BASE}/{path}/scoreboard")
        resp.raise_for_status()
        data = resp.json()

        events = []
        for e in data.get("events", []):
            competitions = e.get("competitions", [{}])
            comp = competitions[0] if competitions else {}
            competitors = comp.get("competitors", [])

            home = next((c for c in competitors if c.get("homeAway") == "home"), {})
            away = next((c for c in competitors if c.get("homeAway") == "away"), {})

            events.append(Event(
                event_id=e.get("id", ""),
                sport=sport,
                home_team=home.get("team", {}).get("displayName", ""),
                away_team=away.get("team", {}).get("displayName", ""),
                start_time=e.get("date", ""),
                status=e.get("status", {}).get("type", {}).get("name", "scheduled"),
                home_score=int(home.get("score", 0)) if home.get("score") else None,
                away_score=int(away.get("score", 0)) if away.get("score") else None,
                metadata=e,
            ))
        return events

    async def get_schedule(self, sport: str = "nfl") -> list[Event]:
        """Get upcoming schedule."""
        path = self.SPORTS.get(sport, sport)
        resp = await self.client.get(f"{self.BASE}/{path}/schedule")
        resp.raise_for_status()
        data = resp.json()

        events = []
        for e in data.get("events", []):
            events.append(Event(
                event_id=e.get("id", ""),
                sport=sport,
                home_team="",  # schedule doesn't always include teams
                away_team="",
                start_time=e.get("date", ""),
                status="scheduled",
                metadata=e,
            ))
        return events


# ─── Polymarket Gamma (pre-game market metadata) ────────────────

class PolymarketGamma:
    """
    Polymarket Gamma API — market metadata, tags, categories.
    Good for pre-game: finding related markets, volume trends.
    No auth required.
    """

    BASE = "https://gamma-api.polymarket.com"

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=15.0)

    async def close(self):
        await self.client.aclose()

    async def get_tags(self) -> list[dict]:
        """List all market tags/categories."""
        resp = await self.client.get(f"{self.BASE}/tags")
        resp.raise_for_status()
        return resp.json()

    async def search_markets(self, query: str, limit: int = 20) -> list[dict]:
        """Search markets by keyword."""
        resp = await self.client.get(
            f"{self.BASE}/markets",
            params={"limit": limit, "tag": query},
        )
        resp.raise_for_status()
        return resp.json() if isinstance(resp.json(), list) else resp.json().get("data", [])

    async def get_related_markets(self, tag: str, limit: int = 50) -> list[dict]:
        """Get all markets related to a tag."""
        resp = await self.client.get(
            f"{self.BASE}/markets",
            params={"tag": tag, "limit": limit, "active": "true"},
        )
        resp.raise_for_status()
        return resp.json() if isinstance(resp.json(), list) else resp.json().get("data", [])


# ─── Pre-Game Aggregator ────────────────────────────────────────

class PreGameAggregator:
    """
    Aggregates pre-game data from multiple sources into a unified context.
    
    Sources:
        - Polymarket Gamma (market metadata)
        - ESPN (schedules, scores)
        - The Odds API (sportsbook odds for comparison)
    """

    def __init__(
        self,
        odds_api_key: Optional[str] = None,
    ):
        self.gamma = PolymarketGamma()
        self.espn = ESPNScores()
        self.odds = TheOddsAPI(odds_api_key) if odds_api_key else None

    async def close(self):
        await self.gamma.close()
        await self.espn.close()
        if self.odds:
            await self.odds.close()

    async def build_context(
        self,
        market_tag: str,
        sport: str = "nfl",
    ) -> PreGameContext:
        """Build pre-game context for a market."""
        # Fetch from multiple sources in parallel
        import asyncio
        tasks = [
            self.gamma.get_related_markets(market_tag),
            self.espn.get_scoreboard(sport),
        ]
        if self.odds:
            tasks.append(self.odds.get_odds(f"americanfootball_{sport}" if sport == "nfl" else sport))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Parse results
        polymarket_data = results[0] if not isinstance(results[0], Exception) else []
        espn_events = results[1] if not isinstance(results[1], Exception) else []
        odds_data = results[2] if len(results) > 2 and not isinstance(results[2], Exception) else []

        context = PreGameContext(
            market_id=market_tag,
            volume_history=[],
            metadata={
                "polymarket_related": len(polymarket_data),
                "espn_events": len(espn_events),
                "odds_sources": len(odds_data) if isinstance(odds_data, list) else 0,
            },
        )

        return context


# ─── Convenience ─────────────────────────────────────────────────

async def get_pregame_snapshot(
    sport: str = "nfl",
    odds_api_key: Optional[str] = None,
) -> dict:
    """Quick pre-game data snapshot."""
    espn = ESPNScores()
    try:
        events = await espn.get_scoreboard(sport)
        return {
            "sport": sport,
            "events": [
                {
                    "id": e.event_id,
                    "matchup": f"{e.away_team} @ {e.home_team}",
                    "time": e.start_time,
                    "status": e.status,
                    "score": f"{e.away_score}-{e.home_score}" if e.away_score is not None else None,
                }
                for e in events
            ],
            "count": len(events),
        }
    finally:
        await espn.close()
