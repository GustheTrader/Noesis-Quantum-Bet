"""
API Smoke Test — Verify all public endpoints work.
No auth needed — tests public market data only.
"""

import asyncio
import json


async def test_polymarket():
    """Test Polymarket Gamma API (public)."""
    from feeds.polymarket import PolymarketREST

    print("\n━━━ Polymarket Gamma API ━━━")
    rest = PolymarketREST()
    try:
        markets = await rest.get_markets(limit=5, active=True)
        print(f"  ✅ Fetched {len(markets)} markets")
        for m in markets[:3]:
            print(f"    {m.question[:60]}...")
            print(f"      volume={m.volume:.0f} liquidity={m.liquidity:.0f}")
        return True
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False
    finally:
        await rest.close()


async def test_kalshi():
    """Test Kalshi API — requires auth, so we test with demo if keys available."""
    from feeds.kalshi import KalshiClient
    import os

    print("\n━━━ Kalshi API ━━━")

    # Try demo if env vars set
    key_id = os.environ.get("KALSHI_KEY_ID")
    pem_path = os.environ.get("KALSHI_PEM_PATH")

    if key_id and pem_path:
        client = KalshiClient.demo(key_id, pem_path)
        try:
            status = await client.get_exchange_status()
            print(f"  ✅ Exchange status: {status}")
            markets = await client.get_markets(limit=5, status="open")
            print(f"  ✅ Fetched {len(markets)} markets")
            for m in markets[:3]:
                bid = client.cents_to_dollars(m.yes_ask) if m.yes_ask else "N/A"
                print(f"    {m.title[:60]}...")
                print(f"      yes_ask=${bid} volume={m.volume}")
            return True
        except Exception as e:
            print(f"  ❌ Error: {e}")
            return False
        finally:
            await client.close()
    else:
        print("  ⏭️  Skipped — set KALSHI_KEY_ID and KALSHI_PEM_PATH to test")
        print("     (Kalshi requires auth for all endpoints)")
        return True  # not a failure — just needs credentials


async def test_espn():
    """Test ESPN public API."""
    from feeds.pregame import ESPNScores

    print("\n━━━ ESPN Scores API ━━━")
    espn = ESPNScores()
    try:
        events = await espn.get_scoreboard("nfl")
        print(f"  ✅ Fetched {len(events)} NFL events")
        for e in events[:3]:
            score = f"{e.away_score}-{e.home_score}" if e.away_score is not None else "TBD"
            print(f"    {e.away_team} @ {e.home_team}: {score} ({e.status})")
        return True
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False
    finally:
        await espn.close()


async def test_pregame_snapshot():
    """Test pre-game data aggregator."""
    from feeds.pregame import get_pregame_snapshot

    print("\n━━━ Pre-Game Snapshot ━━━")
    try:
        snapshot = await get_pregame_snapshot("nfl")
        print(f"  ✅ {snapshot['count']} events for {snapshot['sport']}")
        for ev in snapshot["events"][:3]:
            print(f"    {ev['matchup']} — {ev['status']}")
        return True
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


async def main():
    print("=" * 60)
    print("COPY BOT — API Smoke Tests")
    print("=" * 60)

    results = {}
    results["polymarket"] = await test_polymarket()
    results["kalshi"] = await test_kalshi()
    results["espn"] = await test_espn()
    results["pregame"] = await test_pregame_snapshot()

    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    for name, ok in results.items():
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"  {name:20s} {status}")

    all_pass = all(results.values())
    print(f"\n{'✅ All tests passed!' if all_pass else '⚠️  Some tests failed'}")


if __name__ == "__main__":
    asyncio.run(main())
