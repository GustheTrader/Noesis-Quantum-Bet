
import { WeekData, BetResult, PickArchiveItem, GameSummary } from './types';

export const APP_NAME = "Quantum Bets";
export const APP_VERSION = "2025.1.0";
export const AUTHORIZED_ADMIN = "jeffgus@gmail.com";

export const INITIAL_PICKS_CONTENT = `# WEEK 6 ALPHA REPORT

## EXECUTIVE SUMMARY
The Quantum Model has identified a severe pricing dislocation in the NFC North moneyline markets.

## OFFICIAL POSITIONS

- **Lions -3.0** (-110) | Conf: 5 | Units: 3.5u | EV: +6.4% | Sharp: -3.5 | Book: -3.0 | Risks: LT injury volatility; monitor weather reports at Dallas.
  Model flags this as a high-limit anchor. Cowboys rush defense is currently ranking bottom 3 in DVOA over the last 14 days.

- **Steelers +3.0** (-115) | Conf: 4 | Units: 2.0u | EV: +4.8% | Sharp: +2.5 | Book: +3.0 | Risks: Mike Tomlin underdog variance; Texans pass rush efficiency.
  The image confirms this line holds at +3 (-115). This remains the ultimate structural edge. Home underdog in playoffs / Wild Card dog.

- **Ravens ML** (-175) | Conf: 4 | Units: 3.0u | EV: +3.9% | Sharp: -185 | Book: -175 | Risks: Lamar Jackson turnover rate under zero-blitz conditions.
  EPA/play metrics suggest Baltimore dominates the interior offensive line mismatch against Washington.

## ASYMMETRICAL PARLAYS

- **Lions -3, Steelers +3** (+260) | Conf: 3 | Units: 1.5u | EV: +11.2% | Risks: Correlation variance; high ceiling play.
  Asymmetrical return play targeting regional price dislocations across offshore and regulated books.

- **Chiefs ML, Bills ML, Warriors ML** (+450) | Conf: 2 | Units: 1.0u | EV: +14.5% | Risks: Multi-league cross-contamination risk.
  Three-leg liquidity anchor. Geometric bankroll growth target for asymmetrical capital allocation.`;

export const INITIAL_ARCHIVE: PickArchiveItem[] = [
    {
        id: 'arch-1',
        date: '2025-10-06',
        title: 'Week 5 Recap',
        content: `# WEEK 5 RECAP\n\n- **Jaguars ML** (+160) | Conf: 5 | Units: 2.0u | Risks: Resulted in WIN.\n\n- **Travis Etienne Anytime TD** (+135) | Conf: 3 | Units: 1.0u | Risks: Resulted in LOSS.`,
        // Fix: Added missing 'league' property to satisfy PickArchiveItem interface
        league: 'NFL'
    }
];

export const INITIAL_GAME_SUMMARIES: GameSummary[] = [
    {
        id: 'sum-1',
        title: 'Week 5: Jaguars vs Bills',
        date: '2025-10-06',
        content: `# LONDON GAME RECAP\n\n- **Trevor Lawrence o250.5 Pass Yds** (-110) | Conf: 4 | Units: 2.5u | Risks: WR drop rate variability.\nLawrence delivered 315 Yds.`,
        // Fix: Added missing 'league' property to satisfy GameSummary interface
        league: 'NFL'
    }
];

export const INITIAL_WEEK_DATA: WeekData[] = [
  {
    id: 'w5-mon',
    title: 'Week 5 - Monday',
    overallRoi: 47.2,
    // Fix: Added missing 'league' property to satisfy WeekData interface
    league: 'NFL',
    pools: [
      {
        id: 'p1',
        name: 'Pool 1: Spreads & Totals',
        netProfit: 24.33,
        roi: 4.9,
        bets: [
          { id: '1', description: 'Jaguars +3.5', stake: 286, units: 2.86, odds: '-120', result: BetResult.WIN, profit: 238.33, betType: 'SINGLE' },
          { id: '2', description: 'UNDER 45.5 (JAX/KC)', stake: 214, units: 2.14, odds: '-105', result: BetResult.LOSS, profit: -214.00, betType: 'SINGLE' }
        ]
      },
      {
        id: 'p2',
        name: 'Pool 2: Player Props',
        netProfit: -310.79,
        roi: -62.1,
        bets: [
          { id: '3', description: 'Travis Etienne Jr. OVER 65.5 Rush Yds', stake: 153, units: 1.53, odds: '-114', result: BetResult.LOSS, profit: -153, betType: 'SINGLE' },
          { id: '4', description: 'Travis Etienne Jr. Anytime TD', stake: 204, units: 2.04, odds: '+135', result: BetResult.LOSS, profit: -204, betType: 'SINGLE' },
          { id: '5', description: 'Travis Kelce OVER 41.5 Rec Yds', stake: 83, units: 0.83, odds: '-114', result: BetResult.WIN, profit: 72.81, betType: 'SINGLE' },
        ]
      }
    ]
  }
];
