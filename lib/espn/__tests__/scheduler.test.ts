import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import nba from '../__fixtures__/nba_scoreboard_pregame.json';
import { EspnHttpError } from '../client';
import { oddsKey, type EspnDbWriter, type IngestRunRow } from '../ingest';
import type { EventRow, OddsSnapshotRow } from '../normalize';
import { ESPN_USER_AGENT, createPollLoop, defaultFetch, mapLimit, pollDates, redact, runPollTick, summarizeTick } from '../scheduler';

class FakeDb implements EspnDbWriter {
  events = new Map<string, EventRow>();
  odds: OddsSnapshotRow[] = [];
  runs: IngestRunRow[] = [];
  constructor(private failWrites = false) {}
  async upsertEvents(rows: EventRow[]) {
    if (this.failWrites) throw new Error('connect ECONNREFUSED postgres://postgres:hunter2@db:5432/x');
    for (const r of rows) this.events.set(r.espn_id, r);
  }
  async upsertCompetitors() {}
  async latestOdds(ids: string[]) {
    const m = new Map<string, OddsSnapshotRow>();
    for (const o of this.odds) if (ids.includes(o.event_id)) m.set(oddsKey(o), o);
    return m;
  }
  async insertOdds(rows: OddsSnapshotRow[]) {
    this.odds.push(...rows);
  }
  async insertIngestRun(r: IngestRunRow) {
    this.runs.push(r);
  }
}

const EMPTY = { events: [] };
const NOW = () => new Date('2026-11-04T03:30:00Z'); // 22:30 ET on Nov 3

describe('pollDates (US Eastern)', () => {
  it('uses the ET calendar day, not UTC', () => {
    expect(pollDates(new Date('2026-11-04T03:30:00Z'))).toEqual(['20261103', '20261104']);
    expect(pollDates(new Date('2026-11-04T05:00:00Z'))).toEqual(['20261104', '20261105']);
  });
  it('rolls month/year and survives DST transitions', () => {
    expect(pollDates(new Date('2026-12-31T20:00:00Z'))).toEqual(['20261231', '20270101']);
    expect(pollDates(new Date('2026-11-01T12:00:00Z'))).toEqual(['20261101', '20261102']); // DST ends
    expect(pollDates(new Date('2027-03-14T12:00:00Z'))).toEqual(['20270314', '20270315']); // DST starts
  });
});

describe('mapLimit', () => {
  it('caps concurrency and isolates rejections', async () => {
    let inFlight = 0;
    let peak = 0;
    const res = await mapLimit([1, 2, 3, 4, 5, 6, 7, 8], 4, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight--;
      if (n === 3) throw new Error('boom');
      return n * 2;
    });
    expect(peak).toBe(4);
    expect(res[2].status).toBe('rejected');
    expect(res.filter((r) => r.status === 'fulfilled')).toHaveLength(7);
  });
});

describe('runPollTick', () => {
  it('fetches today+tomorrow (ET) per league, skips empty slates, isolates a failing league', async () => {
    const db = new FakeDb();
    const calls: string[] = [];
    const s = await runPollTick({
      writers: [{ name: 'zo', writer: db }],
      now: NOW,
      fetch: async (league, date) => {
        calls.push(`${league}/${date}`);
        if (league === 'nfl') throw new EspnHttpError(503, 'https://x');
        if (league === 'nba' && date === '20261103') return { status: 200, data: nba };
        return { status: 200, data: EMPTY };
      },
    });
    expect(calls.sort()).toEqual(
      ['mlb/20261103', 'mlb/20261104', 'nba/20261103', 'nba/20261104', 'nfl/20261103', 'nfl/20261104', 'nhl/20261103', 'nhl/20261104'].sort(),
    );
    const by = Object.fromEntries(s.tasks.map((t) => [`${t.league}/${t.date}`, t.status]));
    expect(by['nba/20261103']).toBe('ingested');
    expect(by['nfl/20261103']).toBe('fetch_error');
    expect(by['nhl/20261104']).toBe('skipped');
    expect(s.allFailed).toBe(false);
    expect(db.events.size).toBe(3);
    // ingest_runs: 1 success (nba) + 2 fetch errors (nfl x2); skipped slates write nothing
    expect(db.runs.filter((r) => r.status === 'success').map((r) => r.league)).toEqual(['nba']);
    expect(db.runs.filter((r) => r.status === 'error')).toHaveLength(2);
    expect(db.runs.every((r) => r.job === 'poll')).toBe(true);
    expect(db.runs.find((r) => r.status === 'error')!.http_code).toBe(503);
  });

  it('odds are append-only on change: a second identical tick inserts nothing', async () => {
    const db = new FakeDb();
    const deps = { writers: [{ name: 'zo', writer: db }], leagues: ['nba' as const], now: NOW, fetch: async () => ({ status: 200, data: nba }) };
    await runPollTick(deps);
    const n = db.odds.length;
    expect(n).toBeGreaterThan(0);
    await runPollTick(deps);
    expect(db.odds.length).toBe(n);
  });

  it('fans out to multiple writers; one failing writer does not affect the other, errors are redacted', async () => {
    const good = new FakeDb();
    const bad = new FakeDb(true);
    const s = await runPollTick({
      writers: [
        { name: 'zo', writer: good },
        { name: 'cloud', writer: bad },
      ],
      leagues: ['nba'],
      now: NOW,
      fetch: async () => ({ status: 200, data: nba }),
    });
    expect(good.events.size).toBe(3);
    const w = s.tasks[0].writers;
    expect(w.find((x) => x.writer === 'zo')!.ok).toBe(true);
    expect(w.find((x) => x.writer === 'cloud')!.ok).toBe(false);
    const line = summarizeTick(s);
    expect(line).not.toContain('hunter2');
    expect(bad.runs[0].status).toBe('error');
    expect(s.allFailed).toBe(false);
  });

  it('flags allFailed when every fetch fails', async () => {
    const s = await runPollTick({ writers: [{ name: 'zo', writer: new FakeDb() }], now: NOW, fetch: async () => { throw new Error('offline'); } });
    expect(s.allFailed).toBe(true);
  });

  it('default fetch sends the custom User-Agent', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => EMPTY }));
    await defaultFetch({ fetchImpl })('nba', '20261103');
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('dates=20261103'), expect.objectContaining({ headers: { 'User-Agent': ESPN_USER_AGENT } }));
  });
});

describe('redact', () => {
  it('removes credentials from connection strings and JWTs', () => {
    expect(redact('fail postgres://u:p4ss@h:5432/db')).toBe('fail postgres://***@h:5432/db');
    expect(redact('key eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.abcDEF123')).toBe('key ***');
  });
});

describe('createPollLoop', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('never overlaps: runOnce while a tick is in flight is skipped', async () => {
    let release!: () => void;
    const tick = vi.fn(() => new Promise<void>((r) => (release = r)));
    const loop = createPollLoop({ tick });
    const first = loop.runOnce();
    expect(loop.isRunning).toBe(true);
    expect(await loop.runOnce()).toBe('skipped');
    release();
    expect(await first).toBe('ok');
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it('ticks every 60s at a fixed rate and backs off exponentially on failure, then resets', async () => {
    const outcomes = [{}, { allFailed: true }, { allFailed: true }, {}, {}];
    const starts: number[] = [];
    let i = 0;
    const loop = createPollLoop({
      tick: async () => {
        starts.push(Date.now());
        await new Promise((r) => setTimeout(r, 5_000)); // each tick takes 5s
        const o = outcomes[i++] ?? {};
        if (i === 5) loop.stop();
        return o;
      },
    });
    const t0 = Date.now();
    const done = loop.start();
    await vi.advanceTimersByTimeAsync(1_000_000);
    await done;
    const rel = starts.map((s) => s - t0);
    // ok -> +60s (fixed rate, 5s tick absorbed); fail -> 60s; fail -> 120s; ok -> 60s
    expect(rel).toEqual([0, 60_000, 125_000, 250_000, 310_000]);
  });

  it('a throwing tick does not kill the loop', async () => {
    let n = 0;
    const onError = vi.fn();
    const loop = createPollLoop({
      tick: async () => {
        n++;
        if (n === 1) throw new Error('db down');
        loop.stop();
      },
      onError,
    });
    const done = loop.start();
    await vi.advanceTimersByTimeAsync(200_000);
    await done;
    expect(n).toBe(2);
    expect(onError).toHaveBeenCalledOnce();
    expect(loop.consecutiveFailures).toBe(1);
  });
});
