import { describe, expect, test } from 'bun:test';
import {
  isEspnEventId,
  parseNflScoreboard,
  validateModelPredictions,
  freshnessSeconds,
  NO_MODEL_UNAVAILABLE,
} from './nfl';

const NOW = new Date('2026-11-08T00:30:00Z');

const SCOREBOARD = {
  leagues: [{ id: '28', name: 'National Football League' }],
  events: [
    {
      id: '401772510',
      date: '2026-11-08T18:00Z',
      name: 'Dallas Cowboys at Philadelphia Eagles',
      status: {
        type: { state: 'in', detail: '2nd Quarter - 4:12', completed: false, description: 'In Progress' },
        displayClock: '4:12',
        period: 2,
      },
      competitions: [
        {
          competitors: [
            { homeAway: 'home', score: '14', team: { id: '21', abbreviation: 'PHI', displayName: 'Philadelphia Eagles', logo: 'https://a.espncdn.com/phi.png' } },
            { homeAway: 'away', score: '7', team: { id: '6', abbreviation: 'DAL', displayName: 'Dallas Cowboys', logo: 'https://a.espncdn.com/dal.png' } },
          ],
          odds: [{ details: 'PHI -3.5', overUnder: 47.5 }],
        },
      ],
    },
    {
      id: '401772511',
      date: '2026-11-08T21:25Z',
      status: { type: { state: 'pre', detail: 'Sun 1:25 PM', completed: false, description: 'Scheduled' }, displayClock: '0:00', period: 0 },
      competitions: [
        {
          competitors: [
            { homeAway: 'home', score: '0', team: { id: '1', abbreviation: 'BUF', displayName: 'Buffalo Bills' } },
            { homeAway: 'away', score: '0', team: { id: '2', abbreviation: 'NYJ', displayName: 'New York Jets' } },
          ],
        },
      ],
    },
  ],
};

describe('isEspnEventId', () => {
  test('accepts a bare numeric ESPN event id', () => {
    expect(isEspnEventId('401772510')).toBe(true);
  });
  test('rejects path traversal, query injection, letters, empty, and oversize ids', () => {
    for (const bad of ['../x', '401772510?x=1', '12a', '', '1234567890123', ' 401772510', '401772510/summary']) {
      expect(isEspnEventId(bad)).toBe(false);
    }
  });
  test('rejects non-string input', () => {
    expect(isEspnEventId(401772510 as unknown as string)).toBe(false);
    expect(isEspnEventId(null as unknown as string)).toBe(false);
  });
});

describe('parseNflScoreboard', () => {
  test('maps ESPN events to games with status, clock and scores, with provenance and no odds', () => {
    const board = parseNflScoreboard(SCOREBOARD, NOW);
    expect(board.source).toBe('espn');
    expect(board.sport).toBe('nfl');
    expect(board.fetched_at).toBe(NOW.toISOString());
    expect(board.games.length).toBe(2);
    const live = board.games[0];
    expect(live.event_id).toBe('401772510');
    expect(live.state).toBe('in');
    expect(live.detail).toBe('2nd Quarter - 4:12');
    expect(live.clock).toBe('4:12');
    expect(live.period).toBe(2);
    expect(live.home).toEqual({ abbr: 'PHI', name: 'Philadelphia Eagles', score: 14, logo: 'https://a.espncdn.com/phi.png' });
    expect(live.away.score).toBe(7);
    expect(live).not.toHaveProperty('spread');
    expect(live).not.toHaveProperty('odds');
    expect(board.games[1].state).toBe('pre');
    expect(board.games[1].home.score).toBe(0);
  });

  test('throws invalid_payload when events are missing', () => {
    expect(() => parseNflScoreboard({ leagues: [] }, NOW)).toThrow('invalid_payload');
    expect(() => parseNflScoreboard(null, NOW)).toThrow('invalid_payload');
  });

  test('skips events without two competitors instead of inventing teams', () => {
    const broken = { events: [{ id: '1', competitions: [{ competitors: [{ homeAway: 'home', team: { abbreviation: 'X' } }] }] }] };
    expect(parseNflScoreboard(broken, NOW).games.length).toBe(0);
  });
});

describe('freshnessSeconds', () => {
  test('measures seconds between fetch and now, never negative', () => {
    expect(freshnessSeconds('2026-11-08T00:29:30.000Z', NOW)).toBe(30);
    expect(freshnessSeconds('2026-11-08T00:31:00.000Z', NOW)).toBe(0);
  });
});

describe('validateModelPredictions', () => {
  const known = new Set(['401772510', '401772511']);
  const base = { model: 'x', version: '1', generated_at: '2026-11-08T00:25:00Z', as_of: '2026-11-08T00:25:00Z' };
  const opts = { now: NOW, maxAgeSeconds: 3600, knownEventIds: known };

  test('no model output returns the explicit unavailable reason with empty predictions', () => {
    expect(NO_MODEL_UNAVAILABLE).toEqual({ status: 'unavailable', reason: 'no_running_nfl_model', predictions: [] });
    expect(validateModelPredictions(null, opts)).toEqual(NO_MODEL_UNAVAILABLE);
  });

  test('keeps valid predictions and rejects bad probability, future, stale, and unmatched rows', () => {
    const payload = {
      ...base,
      predictions: [
        { event_id: '401772510', home_win_prob: 0.61 },
        { event_id: '401772511', home_win_prob: 1.4 },
        { event_id: '401772510', home_win_prob: Number.NaN },
        { event_id: '999999999', home_win_prob: 0.5 },
        { event_id: '401772511', home_win_prob: 0.3, generated_at: '2026-11-08T03:00:00Z' },
        { event_id: '401772511', home_win_prob: 0.3, generated_at: '2026-11-07T00:00:00Z' },
      ],
    };
    const out = validateModelPredictions(payload, opts);
    expect(out.status).toBe('ok');
    expect(out.predictions.map((p) => p.event_id)).toEqual(['401772510']);
    expect(out.rejected.map((r) => r.reason)).toEqual([
      'probability_out_of_range',
      'probability_out_of_range',
      'unmatched_event_id',
      'future_timestamp',
      'stale',
    ]);
  });

  test('a payload whose every row is invalid is unavailable, not ok', () => {
    const out = validateModelPredictions({ ...base, predictions: [{ event_id: '1', home_win_prob: 0.5 }] }, opts);
    expect(out.status).toBe('unavailable');
    expect((out as any).reason).toBe('no_valid_predictions');
    expect(out.predictions).toEqual([]);
  });
});

import { simulationAllowed, upstreamHealth, formatNflStatus } from './nfl';

describe('simulation guard', () => {
  test('NFL props/arbitrage never run the random generators', () => {
    expect(simulationAllowed('NFL')).toEqual({ allowed: false, reason: 'no_nfl_prop_feed' });
  });
  test('other leagues keep their existing behaviour', () => {
    expect(simulationAllowed('NBA')).toEqual({ allowed: true, reason: null });
  });
});

describe('upstreamHealth', () => {
  const now = new Date('2026-11-08T00:40:00Z');
  test('no successful fetch is UNAVAILABLE, never ONLINE', () => {
    expect(upstreamHealth({ lastOkAt: null, now, maxAgeSeconds: 120 })).toBe('UNAVAILABLE');
  });
  test('recent success is ONLINE, old success is STALE', () => {
    expect(upstreamHealth({ lastOkAt: new Date('2026-11-08T00:39:30Z'), now, maxAgeSeconds: 120 })).toBe('ONLINE');
    expect(upstreamHealth({ lastOkAt: new Date('2026-11-08T00:30:00Z'), now, maxAgeSeconds: 120 })).toBe('STALE');
  });
});

describe('formatNflStatus', () => {
  test('final, live and scheduled games are labelled from the source status', () => {
    expect(formatNflStatus({ state: 'post', detail: 'Final', period: 4, clock: '0:00' })).toBe('Final');
    expect(formatNflStatus({ state: 'in', detail: '2nd Quarter - 4:12', period: 2, clock: '4:12' })).toBe('2nd Quarter - 4:12');
    expect(formatNflStatus({ state: 'pre', detail: 'Sun 1:25 PM', period: null, clock: null })).toBe('Sun 1:25 PM');
  });
  test('an empty detail is shown as unknown, not as a made-up state', () => {
    expect(formatNflStatus({ state: 'unknown', detail: '', period: null, clock: null })).toBe('Status unavailable');
  });
});

import { footerProviderLabel } from './nfl';

describe('footerProviderLabel', () => {
  test('NFL names the real source and states sharp odds and model are unavailable', () => {
    const label = footerProviderLabel('NFL');
    expect(label).toContain('ESPN');
    expect(label).toContain('schedule');
    expect(label).toContain('scores');
    expect(label).toContain('sharp odds: unavailable');
    expect(label).toContain('NFL model: unavailable');
    expect(label).not.toContain('SportsData');
    expect(label).not.toContain('Claude');
  });
  test('other leagues return null so their existing footer is untouched', () => {
    expect(footerProviderLabel('NBA')).toBeNull();
    expect(footerProviderLabel('CFB')).toBeNull();
  });
});

describe('model output contract (canonical membership, required fields, timestamps)', () => {
  const known = new Set(['401873037']);
  const now = new Date('2026-11-08T00:30:00Z');
  const opts = { now, maxAgeSeconds: 3600, knownEventIds: known };
  const good = { model: 'm', version: '1', generated_at: '2026-11-08T00:25:00Z', as_of: '2026-11-08T00:25:00Z', predictions: [{ event_id: '401873037', home_win_prob: 0.5 }] };

  test('a fully specified row is accepted', () => {
    expect(validateModelPredictions(good, opts).status).toBe('ok');
  });
  test('missing model name rejects the row', () => {
    const out: any = validateModelPredictions({ ...good, model: undefined }, opts);
    expect(out.status).toBe('unavailable');
    expect(out.rejected[0].reason).toBe('missing_model');
  });
  test('missing version rejects the row', () => {
    const out: any = validateModelPredictions({ ...good, version: '' }, opts);
    expect(out.rejected[0].reason).toBe('missing_version');
  });
  test('missing or unparsable as_of rejects the payload rows', () => {
    const out: any = validateModelPredictions({ ...good, as_of: undefined }, opts);
    expect(out.rejected[0].reason).toBe('missing_as_of');
  });
  test('an as_of in the future is rejected', () => {
    const out: any = validateModelPredictions({ ...good, as_of: '2026-11-08T05:00:00Z' }, opts);
    expect(out.rejected[0].reason).toBe('future_as_of');
  });
  test('an empty canonical event set cannot validate anything and is unavailable', () => {
    const out: any = validateModelPredictions(good, { ...opts, knownEventIds: new Set() });
    expect(out.status).toBe('unavailable');
    expect(out.reason).toBe('no_espn_event_ids');
  });
});

describe('malformed or empty ESPN payloads are never healthy', () => {
  test('an empty events array throws empty_payload instead of an empty healthy board', () => {
    expect(() => parseNflScoreboard({ events: [] }, NOW)).toThrow('empty_payload');
  });
});
