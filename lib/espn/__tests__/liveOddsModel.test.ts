import { describe, expect, it } from 'vitest';
import { toBoardMatchups } from '../boardModel';
import { OFF, toLiveOddsRow, toLiveOddsRows, toTickerTeams } from '../liveOddsModel';
import type { EventRead, OddsByEvent, OddsLine } from '../reader';

const line = (o: Partial<OddsLine>): OddsLine => ({
  spreadHome: null, spreadAway: null, overUnder: null, mlHome: null, mlAway: null, details: null,
  capturedAt: '2026-11-03T10:00:00Z', ...o,
});

const ev = (id: string, o: Partial<EventRead> = {}): EventRead => ({
  espn_id: id, league: 'nba', name: null, short_name: null,
  start_time: '2026-11-05T00:00:00+00:00', status_state: 'pre', status_detail: '11/4 - 7:00 PM EST',
  completed: false, updated_at: '2026-11-03T09:00:00Z',
  home: { home_away: 'home', abbreviation: 'BOS', display_name: 'Boston Celtics', logo: 'h.png', score: null, winner: null },
  away: { home_away: 'away', abbreviation: 'CHA', display_name: 'Charlotte Hornets', logo: 'a.png', score: null, winner: null },
  ...o,
});

describe('toLiveOddsRow', () => {
  it('maps real lines per side with provider + capturedAt', () => {
    const odds: OddsByEvent = {
      e1: [{ provider: 'DraftKings', snapshotCount: 1, opening: line({}), latest: line({ spreadHome: -3.5, spreadAway: 3.5, overUnder: 221, mlHome: -160, mlAway: 135, capturedAt: '2026-11-03T11:00:00Z' }) }],
    };
    const [m] = toBoardMatchups([ev('e1')], odds);
    expect(toLiveOddsRow(m)).toMatchObject({
      id: 'e1', homeTeam: 'BOS', awayTeam: 'CHA', homeLogo: 'h.png', awayLogo: 'a.png',
      spreadHome: '-3.5', spreadAway: '+3.5', total: '221.0', mlHome: '-160', mlAway: '+135',
      provider: 'DraftKings', capturedAt: '2026-11-03T11:00:00Z', isLive: false, isFinal: false,
    });
  });
  it('renders missing markets as OFF and never estimates a moneyline', () => {
    const odds: OddsByEvent = { e1: [{ provider: 'ESPN BET', snapshotCount: 1, opening: line({}), latest: line({ spreadHome: -2, spreadAway: 2 }) }] };
    const r = toLiveOddsRow(toBoardMatchups([ev('e1')], odds)[0]);
    expect(r.spreadHome).toBe('-2');
    expect([r.total, r.mlHome, r.mlAway]).toEqual([OFF, OFF, OFF]);
  });
  it('handles events with no odds at all', () => {
    const r = toLiveOddsRow(toBoardMatchups([ev('e1')], {})[0]);
    expect([r.spreadAway, r.spreadHome, r.total, r.mlAway, r.mlHome]).toEqual([OFF, OFF, OFF, OFF, OFF]);
    expect(r.provider).toBeNull();
    expect(r.capturedAt).toBeNull();
  });
  it('flags live and final states and keeps scores', () => {
    const live = toLiveOddsRow(toBoardMatchups([ev('e1', { status_state: 'in', home: { home_away: 'home', abbreviation: 'BOS', display_name: null, logo: null, score: 54, winner: null } })], {})[0]);
    expect(live.isLive).toBe(true);
    expect(live.homeScore).toBe(54);
    expect(toLiveOddsRow(toBoardMatchups([ev('e2', { status_state: 'post' })], {})[0]).isFinal).toBe(true);
  });
});

describe('toLiveOddsRows', () => {
  it('orders live, then upcoming by start, then finals', () => {
    const events = [
      ev('final', { status_state: 'post', start_time: '2026-11-03T00:00:00Z' }),
      ev('late', { start_time: '2026-11-04T03:00:00Z' }),
      ev('live', { status_state: 'in', start_time: '2026-11-03T23:00:00Z' }),
      ev('early', { start_time: '2026-11-04T00:00:00Z' }),
    ];
    expect(toLiveOddsRows(toBoardMatchups(events, {})).map((r) => r.id)).toEqual(['live', 'early', 'late', 'final']);
  });
});

describe('toTickerTeams', () => {
  it('dedupes teams across events and keeps logos', () => {
    const events = [
      ev('1'),
      ev('2', { home: { home_away: 'home', abbreviation: 'NYK', display_name: null, logo: 'nyk.png', score: null, winner: null } }),
      ev('3', { home: null, away: { home_away: 'away', abbreviation: ' ', display_name: null, logo: null, score: null, winner: null } }),
    ];
    expect(toTickerTeams(events)).toEqual([
      { abbr: 'CHA', logo: 'a.png' },
      { abbr: 'BOS', logo: 'h.png' },
      { abbr: 'NYK', logo: 'nyk.png' },
    ]);
  });
  it('returns [] for no events', () => {
    expect(toTickerTeams([])).toEqual([]);
  });
});
