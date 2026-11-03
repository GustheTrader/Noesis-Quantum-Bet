import { describe, expect, it } from 'vitest';
import nba from '../__fixtures__/nba_scoreboard_pregame.json';
import nfl from '../__fixtures__/nfl_scoreboard_final.json';
import { normalizeScoreboard, parseMoneyline } from '../normalize';

const T = '2026-11-03T17:00:00.000Z';

describe('normalizeScoreboard: NBA pregame (real ESPN fixture)', () => {
  const b = normalizeScoreboard(nba, 'nba', T);

  it('maps events', () => {
    expect(b.events).toHaveLength(3);
    const e = b.events[0];
    expect(e).toMatchObject({
      espn_id: '401909922',
      league: 'nba',
      short_name: 'PHI @ DET',
      start_time: '2026-11-05T00:00Z',
      status_state: 'pre',
      completed: false,
      season: 2027,
      season_type: 2,
      week: null,
      venue: 'Little Caesars Arena',
    });
    expect(e.raw).toBe(nba.events[0]);
  });

  it('maps competitors with null scores pregame', () => {
    const c = b.competitors.filter((x) => x.event_id === '401909922');
    expect(c).toEqual([
      expect.objectContaining({ team_id: '8', home_away: 'home', abbreviation: 'DET', score: null, winner: null }),
      expect.objectContaining({ team_id: '20', home_away: 'away', abbreviation: 'PHI', score: null }),
    ]);
  });

  it('snapshots odds incl. moneylines for pregame events with odds', () => {
    expect(b.odds).toHaveLength(2);
    expect(b.odds[0]).toEqual({
      event_id: '401909922',
      provider: 'DraftKings',
      spread: -1.5,
      over_under: 217.5,
      details: 'DET -1.5',
      ml_home: -119,
      ml_away: 101,
      captured_at: T,
    });
  });

  it('emits no odds row for a pregame event without odds', () => {
    const noOdds = b.events[2].espn_id;
    expect(b.odds.some((o) => o.event_id === noOdds)).toBe(false);
  });
});

describe('normalizeScoreboard: NFL final (real ESPN fixture)', () => {
  const b = normalizeScoreboard(nfl, 'nfl', T);
  it('maps completed games with scores, winner, week, and no odds', () => {
    expect(b.events).toHaveLength(2);
    expect(b.events[0]).toMatchObject({ espn_id: '401873023', status_state: 'post', completed: true, week: 8, season: 2026 });
    expect(b.competitors.slice(0, 2)).toEqual([
      expect.objectContaining({ abbreviation: 'GB', score: 27, winner: true, home_away: 'home' }),
      expect.objectContaining({ abbreviation: 'CAR', score: 19, winner: false, home_away: 'away' }),
    ]);
    expect(b.odds).toEqual([]);
  });
});

describe('normalizeScoreboard: missing / malformed fields', () => {
  it('handles non-scoreboard input', () => {
    for (const x of [null, undefined, 42, {}, { events: 'nope' }]) {
      expect(normalizeScoreboard(x, 'nhl', T)).toEqual({ league: 'nhl', events: [], competitors: [], odds: [] });
    }
  });

  it('skips events without an id and tolerates missing competition data', () => {
    const b = normalizeScoreboard({ events: [{ name: 'no id' }, { id: '1' }, { id: 2, competitions: [{ competitors: [{ homeAway: 'home' }] }] }] }, 'mlb', T);
    expect(b.events.map((e) => e.espn_id)).toEqual(['1', '2']);
    expect(b.events[0]).toMatchObject({ start_time: null, status_state: null, completed: false, season: null, venue: null });
    expect(b.competitors).toEqual([]); // competitor without team id dropped
    expect(b.odds).toEqual([]);
  });

  it('drops empty odds objects and falls back to core.api moneyLine fields', () => {
    const b = normalizeScoreboard(
      {
        events: [
          {
            id: '9',
            status: { type: { state: 'pre', completed: false } },
            competitions: [{ odds: [{ provider: { name: 'X' } }, { provider: { name: 'DK' }, homeTeamOdds: { moneyLine: -150 }, awayTeamOdds: { moneyLine: 130 } }] }],
          },
        ],
      },
      'nhl',
      T,
    );
    expect(b.odds).toEqual([expect.objectContaining({ provider: 'DK', ml_home: -150, ml_away: 130, spread: null, over_under: null, details: null })]);
  });
});

describe('parseMoneyline', () => {
  it('parses american odds strings', () => {
    expect(parseMoneyline('-119')).toBe(-119);
    expect(parseMoneyline('+101')).toBe(101);
    expect(parseMoneyline('EVEN')).toBe(100);
    expect(parseMoneyline(-200)).toBe(-200);
    expect(parseMoneyline('')).toBeNull();
    expect(parseMoneyline('OFF')).toBeNull();
    expect(parseMoneyline(undefined)).toBeNull();
  });
});
