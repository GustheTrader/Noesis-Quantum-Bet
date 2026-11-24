import { describe, expect, it, vi } from 'vitest';
import nba from '../__fixtures__/nba_scoreboard_pregame.json';
import nfl from '../__fixtures__/nfl_scoreboard_final.json';
import { ingestBatch, oddsKey, runScoreboardIngest, type EspnDbWriter, type IngestRunRow } from '../ingest';
import { normalizeScoreboard, type CompetitorRow, type EventRow, type OddsSnapshotRow } from '../normalize';
import type { FetchLike } from '../client';

class FakeDb implements EspnDbWriter {
  events = new Map<string, EventRow>();
  competitors = new Map<string, CompetitorRow>();
  odds: OddsSnapshotRow[] = [];
  runs: IngestRunRow[] = [];
  async upsertEvents(rows: EventRow[]) {
    for (const r of rows) this.events.set(r.espn_id, r);
  }
  async upsertCompetitors(rows: CompetitorRow[]) {
    for (const r of rows) this.competitors.set(`${r.event_id}|${r.team_id}`, r);
  }
  async latestOdds(ids: string[]) {
    const m = new Map<string, OddsSnapshotRow>();
    for (const o of this.odds) if (ids.includes(o.event_id)) m.set(oddsKey(o), o); // later rows win
    return m;
  }
  async insertOdds(rows: OddsSnapshotRow[]) {
    this.odds.push(...rows);
  }
  async insertIngestRun(r: IngestRunRow) {
    this.runs.push(r);
  }
}

const T1 = '2026-11-03T17:00:00.000Z';
const T2 = '2026-11-03T18:00:00.000Z';

describe('ingestBatch', () => {
  it('is idempotent: re-ingesting the same scoreboard does not duplicate rows', async () => {
    const db = new FakeDb();
    const r1 = await ingestBatch(normalizeScoreboard(nba, 'nba', T1), db);
    const r2 = await ingestBatch(normalizeScoreboard(nba, 'nba', T2), db);
    expect(r1).toEqual({ events: 3, competitors: 6, oddsInserted: 2, oddsSkipped: 0 });
    expect(r2).toEqual({ events: 3, competitors: 6, oddsInserted: 0, oddsSkipped: 2 });
    expect(db.events.size).toBe(3);
    expect(db.competitors.size).toBe(6);
    expect(db.odds).toHaveLength(2);
  });

  it('appends an odds snapshot only when values changed', async () => {
    const db = new FakeDb();
    await ingestBatch(normalizeScoreboard(nba, 'nba', T1), db);
    const moved = structuredClone(nba) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    moved.events[0].competitions[0].odds[0].spread = -2.5;
    moved.events[0].competitions[0].odds[0].details = 'DET -2.5';
    const r = await ingestBatch(normalizeScoreboard(moved, 'nba', T2), db);
    expect(r.oddsInserted).toBe(1);
    expect(db.odds).toHaveLength(3);
    expect(db.odds.at(-1)).toMatchObject({ event_id: '401909922', spread: -2.5, captured_at: T2 });
    // original snapshot preserved (append-only)
    expect(db.odds[0]).toMatchObject({ spread: -1.5, captured_at: T1 });
  });

  it('treats Postgres numeric strings as equal to numbers', async () => {
    const db = new FakeDb();
    const b = normalizeScoreboard(nba, 'nba', T1);
    db.odds = b.odds.map((o) => ({ ...o, spread: String(o.spread) as unknown as number, over_under: String(o.over_under) as unknown as number }));
    const r = await ingestBatch(normalizeScoreboard(nba, 'nba', T2), db);
    expect(r.oddsInserted).toBe(0);
  });

  it('keeps old odds when the game ends and odds disappear', async () => {
    const db = new FakeDb();
    await ingestBatch(normalizeScoreboard(nba, 'nba', T1), db);
    const final = structuredClone(nba);
    for (const e of final.events) delete (e.competitions[0] as { odds?: unknown }).odds;
    const r = await ingestBatch(normalizeScoreboard(final, 'nba', T2), db);
    expect(r.oddsInserted).toBe(0);
    expect(db.odds).toHaveLength(2);
  });

  it('writes a success ingest_runs row', async () => {
    const db = new FakeDb();
    const now = vi.fn(() => new Date(T2));
    await ingestBatch(normalizeScoreboard(nfl, 'nfl', T1), db, { job: 'scoreboard', httpCode: 200, startedAt: T1, now });
    expect(db.runs).toEqual([
      { job: 'scoreboard', league: 'nfl', status: 'success', http_code: 200, rows: 2 + 4, error: null, started_at: T1, finished_at: T2 },
    ]);
  });

  it('writes an error ingest_runs row and rethrows on DB failure', async () => {
    const db = new FakeDb();
    db.upsertCompetitors = async () => {
      throw new Error('boom');
    };
    await expect(ingestBatch(normalizeScoreboard(nfl, 'nfl', T1), db, { httpCode: 200 })).rejects.toThrow('boom');
    expect(db.runs).toHaveLength(1);
    expect(db.runs[0]).toMatchObject({ league: 'nfl', status: 'error', http_code: 200, rows: 0, error: 'boom' });
  });

  it('does not mask the original error if logging the failure also fails', async () => {
    const db = new FakeDb();
    db.upsertEvents = async () => {
      throw new Error('primary');
    };
    db.insertIngestRun = async () => {
      throw new Error('secondary');
    };
    await expect(ingestBatch(normalizeScoreboard(nfl, 'nfl', T1), db)).rejects.toThrow('primary');
  });
});

describe('runScoreboardIngest (mocked fetch)', () => {
  const sleep = async () => {};
  it('fetches, normalizes and ingests one league/day', async () => {
    const db = new FakeDb();
    const fetchImpl = vi.fn<FetchLike>(async () => ({ ok: true, status: 200, json: async () => nba }));
    const r = await runScoreboardIngest('nba', '2026-11-04', db, { client: { fetchImpl, sleep } });
    expect(fetchImpl.mock.calls[0][0]).toContain('/basketball/nba/scoreboard?dates=20261104');
    expect(r.events).toBe(3);
    expect(db.runs[0]).toMatchObject({ status: 'success', http_code: 200, league: 'nba' });
  });

  it('logs an error run with the HTTP code when ESPN returns 404', async () => {
    const db = new FakeDb();
    const fetchImpl = vi.fn<FetchLike>(async () => ({ ok: false, status: 404, json: async () => ({}) }));
    await expect(runScoreboardIngest('nfl', '2026-11-03', db, { client: { fetchImpl, sleep } })).rejects.toMatchObject({ status: 404 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(db.runs).toEqual([expect.objectContaining({ status: 'error', http_code: 404, league: 'nfl', rows: 0 })]);
    expect(db.events.size).toBe(0);
  });
});
