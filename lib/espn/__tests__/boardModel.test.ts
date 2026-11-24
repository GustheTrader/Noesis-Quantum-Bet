import { describe, expect, it } from 'vitest';
import { latestCapturedAt, latestEventUpdate, providerToBookId, toBoardMatchups, toLeagueKey } from '../boardModel';
import type { EventRead, OddsByEvent, OddsLine } from '../reader';

const line = (o: Partial<OddsLine>): OddsLine => ({
  spreadHome: null,
  spreadAway: null,
  overUnder: null,
  mlHome: null,
  mlAway: null,
  details: null,
  capturedAt: '2026-11-03T10:00:00Z',
  ...o,
});

const ev = (id: string, o: Partial<EventRead> = {}): EventRead => ({
  espn_id: id,
  league: 'nba',
  name: null,
  short_name: null,
  start_time: '2026-11-05T00:00:00+00:00',
  status_state: 'pre',
  status_detail: '11/4 - 7:00 PM EST',
  completed: false,
  updated_at: '2026-11-03T09:00:00Z',
  home: { home_away: 'home', abbreviation: 'BOS', display_name: 'Boston Celtics', logo: 'h.png', score: null, winner: null },
  away: { home_away: 'away', abbreviation: 'CHA', display_name: 'Charlotte Hornets', logo: 'a.png', score: null, winner: null },
  ...o,
});

describe('league + provider mapping', () => {
  it('maps app leagues to ingested keys', () => {
    expect(toLeagueKey('NBA')).toBe('nba');
    expect(toLeagueKey('NFL')).toBe('nfl');
    expect(toLeagueKey('MLS')).toBeNull();
  });
  it('maps ESPN providers to board books', () => {
    expect(providerToBookId('DraftKings')).toBe('dk');
    expect(providerToBookId('FanDuel')).toBe('fd');
    expect(providerToBookId('Caesars Sportsbook')).toBe('czr');
    expect(providerToBookId('ESPN BET')).toBeNull();
  });
});

describe('toBoardMatchups', () => {
  it('builds rows with away/home spreads, opening vs latest, and book cells', () => {
    const odds: OddsByEvent = {
      '1': [
        { provider: 'ESPN BET', snapshotCount: 1, opening: line({ spreadHome: 3, spreadAway: -3 }), latest: line({ spreadHome: 3, spreadAway: -3 }) },
        {
          provider: 'DraftKings',
          snapshotCount: 2,
          opening: line({ spreadHome: 1.5, spreadAway: -1.5, overUnder: 213, mlHome: 105, mlAway: -125 }),
          latest: line({ spreadHome: 2.5, spreadAway: -2.5, overUnder: 214.5, mlHome: 115, mlAway: -136, capturedAt: '2026-11-03T12:00:00Z' }),
        },
      ],
    };
    const [m, noOdds] = toBoardMatchups([ev('1'), ev('2')], odds);
    expect(m.awayAbr).toBe('CHA');
    expect(m.homeAbr).toBe('BOS');
    expect(m.marketProvider).toBe('DraftKings');
    expect(m.market).toMatchObject({ spreadAway: '-2.5', spreadHome: '+2.5', total: '214.5', mlAway: '-136', mlHome: '+115' });
    expect(m.open).toMatchObject({ spreadAway: '-1.5', spreadHome: '+1.5', total: '213.0' });
    expect(Object.keys(m.bookOdds)).toEqual(['dk']);
    expect(m.date.toISOString()).toBe('2026-11-05T00:00:00.000Z');

    expect(noOdds.market).toBeNull();
    expect(noOdds.open).toBeNull();
    expect(noOdds.bookOdds).toEqual({});
  });

  it('computes data-as-of timestamps', () => {
    const odds: OddsByEvent = {
      '1': [{ provider: 'DraftKings', snapshotCount: 1, opening: line({}), latest: line({ capturedAt: '2026-11-03T12:00:00Z' }) }],
      '2': [{ provider: 'DraftKings', snapshotCount: 1, opening: line({}), latest: line({ capturedAt: '2026-11-03T11:00:00Z' }) }],
    };
    expect(latestCapturedAt(odds)).toBe('2026-11-03T12:00:00Z');
    expect(latestCapturedAt({})).toBeNull();
    expect(latestEventUpdate([ev('1'), ev('2', { updated_at: '2026-11-03T15:00:00Z' })])).toBe('2026-11-03T15:00:00Z');
  });
});
