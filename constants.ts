
import { WeekData, BetResult, PickArchiveItem, GameSummary } from './types';

export const APP_NAME = "Quantum Bets";
export const APP_VERSION = "2025.1.0";
// Admin password is now configured via ADMIN_PASSWORD environment variable
// This constant is kept for backward compatibility but should not be used in new code
export const ADMIN_PASSWORD = "101010"; // Fallback/Legacy - DO NOT USE
export const AUTHORIZED_ADMIN = "jeffgus@gmail.com";

export const INITIAL_PICKS_CONTENT = `# WEEK 6 EDGE REPORT

## EXECUTIVE SUMMARY
The Quantum Model has identified a significant liquidity divergence in the AFC South market. While public sentiment has shifted heavily towards the road favorites, our internal power ratings suggest a 4.2% variance in implied win probability for home underdogs. This week's slate heavily favors **Counter-Intuitive Value** plays where recent bias is inflating lines beyond the standard deviation.

## MARKET ANALYSIS: DETROIT LIONS
**Lions -3 (vs Cowboys)**
The narrative surrounding the Lions' defense is currently skewed by the Week 4 outlier performance. However, Dan Campbell coming off a bye week is historically an 82% ATS cover rate.
The model flags this as a **High Confidence** position due to the mismatch between Detroit's offensive line DVOA (Rank #2) and Dallas's run defense efficiency (Rank #24). We expect Detroit to control the clock and cover the number.

## OFFICIAL POSITIONS

### PRIMARY SPREADS
- **Lions -3.0** (-110): Value up to -4.5.
- **Jaguars +2.5** (London Alt): The travel variance favors Jacksonville's routine.
- **Packers -5.5**: Green Bay's passing EPA/play suggests a blowout potential.

### TOTALS & PROPS
- **Commanders/Ravens OVER 51.5**: Pace of play metrics project 68+ plays per team.
- **Bijan Robinson OVER 75.5 Rush Yds**: Atlanta's game script correlates to a heavy run volume.

## LONGSHOT PARLAY (+850)
1. Lions Moneyline
2. Bengals -3.5
3. Bijan Robinson O 75.5 Rush
4. Falcons -6.0

**NOTE:** Weather conditions in Chicago are deteriorating. Monitor wind speeds for the Bears game before locking in any Over bets.`;

export const INITIAL_ARCHIVE: PickArchiveItem[] = [
    {
        id: 'arch-1',
        date: '2025-10-06',
        title: 'Week 5 Recap',
        content: `# WEEK 5 RECAP\n\n## PERFORMANCE REVIEW\nIt was a volatile week for player props, but the core spread strategy delivered significant returns. The model correctly identified the market overreaction to the Bills, capitalizing on the Jaguars' London advantage.\n\n### BEST BETS\n- **Jags ML (+160)** ✅: High conviction win.\n- **Travis Etienne Anytime TD** ❌: Variance loss on goal line carries.\n\nWe close the week up **+24.3 units**, maintaining our season-long trajectory above the 40% ROI threshold.`
    },
    {
        id: 'arch-2',
        date: '2025-09-29',
        title: 'Week 4 Outlook',
        content: `# WEEK 4 OUTLOOK\n\n## STRATEGY BRIEF\nThe market has not fully adjusted for the Bills' defensive injuries. We are fading public consensus heavily this week.\n\n### PRIMARY TARGETS\n- **Bills -15.5**: Projected line was -19.0.\n- **Chargers +6.5**: Herbert's recovery timeline is ahead of schedule.`
    }
];

export const INITIAL_GAME_SUMMARIES: GameSummary[] = [
    {
        id: 'sum-1',
        title: 'Week 5: Jaguars vs Bills',
        date: '2025-10-06',
        content: `# LONDON GAME RECAP\n\n## THE SETUP\nJaguars coming off a win, Bills traveling overseas. Line movement suggested sharp money on Jags early in the week, pushing the line from +6.5 down to +5.5.\n\n## KEY STAT\n**Trevor Lawrence: 315 Yds, 3 TDs.**\nThe Bills defense allowed 7.5 yards per play, a statistical anomaly for a top-5 DVOA unit. This confirms our hypothesis regarding travel fatigue impacting defensive reaction times.\n\n## MODEL PERFORMANCE\nWe projected Jags +5.5 with a 62% cover probability. They won outright, delivering a **2.6u profit** on the Moneyline position alone.`
    }
];

export const INITIAL_WEEK_DATA: WeekData[] = [
  {
    id: 'w5-mon',
    title: 'Week 5 - Monday',
    overallRoi: 47.2,
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
      },
      {
        id: 'p3',
        name: 'Pool 3: Moneyline',
        netProfit: 1600.00,
        roi: 160.0,
        bets: [
          { id: '6', description: 'Jaguars ML', stake: 1000, units: 10.00, odds: '+160', result: BetResult.WIN, profit: 1600.00, betType: 'SINGLE' }
        ]
      }
    ]
  },
  {
    id: 'w5-sun',
    title: 'Week 5 - Sunday',
    overallRoi: -11.4,
    pools: [
      {
        id: 'p1-sun',
        name: 'Pool 1: Spreads & Totals',
        netProfit: -5.00,
        roi: -1.0,
        bets: [
          { id: '7', description: 'Texans -2.5 (vs Ravens)', stake: 150, units: 1.50, odds: '-120', result: BetResult.WIN, profit: 125, betType: 'SINGLE' },
          { id: '8', description: 'OVER 41.5 (Saints/Giants)', stake: 120, units: 1.20, odds: '-110', result: BetResult.LOSS, profit: -120, betType: 'SINGLE' },
          { id: '9', description: 'Colts -7.5 (vs Raiders)', stake: 110, units: 1.10, odds: '+100', result: BetResult.WIN, profit: 110, betType: 'SINGLE' }
        ]
      },
      {
        id: 'p3-sun',
        name: 'Pool 3: Moneyline',
        netProfit: 75.70,
        roi: 7.6,
        bets: [
          { id: '10', description: 'Houston Texans ML', stake: 300, units: 3.00, odds: '-150', result: BetResult.WIN, profit: 200, betType: 'SINGLE' },
          { id: '11', description: 'Philadelphia Eagles ML', stake: 215, units: 2.15, odds: '-215', result: BetResult.LOSS, profit: -215, betType: 'SINGLE' }
        ]
      }
    ]
  },
  {
    id: 'w4-morn',
    title: 'Week 4 - Morning',
    overallRoi: 29.0,
    pools: [
      {
        id: 'p1-w4',
        name: 'Pool 1: Spreads & Totals',
        netProfit: 286,
        roi: 28.6,
        bets: [
           { id: '12', description: 'Chargers +6.5', stake: 210, units: 2.10, result: BetResult.WIN, profit: 191, score: '21-18', betType: 'SINGLE' },
           { id: '13', description: 'Bills -15.5', stake: 178, units: 1.78, result: BetResult.LOSS, profit: -178, score: '31-19', betType: 'SINGLE' },
        ]
      },
      {
        id: 'p3-w4',
        name: 'Pool 3: Parlays',
        netProfit: 588,
        roi: 588,
        bets: [
          { id: '14', description: '3-Way Parlay Special', stake: 100, units: 1.00, result: BetResult.WIN, profit: 588, betType: 'PARLAY' }
        ]
      }
    ]
  },
  {
      id: 'w3-sun',
      title: 'Week 3 - Sunday',
      overallRoi: 22.2,
      pools: [
          {
              id: 'p1-w3',
              name: 'Pool 1: Standard Bets',
              netProfit: 213,
              roi: 22.2,
              bets: [
                  { id: '15', description: 'Seahawks -7.5', stake: 271, units: 2.71, odds: '+105', result: BetResult.WIN, profit: 285, betType: 'SINGLE' },
                  { id: '16', description: '49ers -1.5', stake: 254, units: 2.54, odds: '-105', result: BetResult.LOSS, profit: -254, betType: 'SINGLE' }
              ]
          }
      ]
  },
  {
      id: 'w2-sun',
      title: 'Week 2 - Sunday',
      overallRoi: 106.0,
      pools: [
          {
              id: 'p1-w2',
              name: 'Pool 1: Moneyline Parlays',
              netProfit: 1131,
              roi: 452.4,
              bets: [
                  { id: '17', description: 'Falcons + Buccaneers ML Parlay', stake: 250, units: 2.50, odds: '+452', result: BetResult.WIN, profit: 1131, betType: 'PARLAY' }
              ]
          }
      ]
  },
  {
      id: 'w1-mon',
      title: 'Week 1 - Monday',
      overallRoi: 114.1,
      pools: [
          {
              id: 'p1-w1',
              name: 'Pool 1: Props & Parlays',
              netProfit: 872,
              roi: 114.1,
              bets: [
                  { id: '18', description: 'Aaron Jones OVER 20 Rec Yds', stake: 180, units: 1.80, odds: '+108', result: BetResult.WIN, profit: 194, betType: 'SINGLE' },
                  { id: '19', description: '3-Team Parlay', stake: 90, units: 0.90, odds: '+487', result: BetResult.WIN, profit: 438, betType: 'PARLAY' }
              ]
          }
      ]
  }
];