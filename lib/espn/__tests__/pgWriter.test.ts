import { describe, expect, it, vi } from 'vitest';
import nba from '../__fixtures__/nba_scoreboard_pregame.json';
import { normalizeScoreboard } from '../normalize';
import { createPgWriter, type Queryable } from '../pgWriter';

function mockDb(rows: unknown[] = []) {
  const query = vi.fn<Queryable['query']>(async () => ({ rows: rows as any[] })); // eslint-disable-line @typescript-eslint/no-explicit-any
  return { query };
}

describe('createPgWriter', () => {
  const b = normalizeScoreboard(nba, 'nba', '2026-11-03T17:00:00.000Z');

  it('upserts events into espn.events with matching placeholder count', async () => {
    const db = mockDb();
    await createPgWriter(db).upsertEvents(b.events);
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/insert into espn\.events/);
    expect(sql).toMatch(/on conflict \(espn_id\) do update/);
    expect(params).toHaveLength(b.events.length * 13);
    expect(sql).toContain(`$${b.events.length * 13}`);
    expect(typeof params![12]).toBe('string'); // raw serialized as JSON
  });

  it('upserts competitors on (event_id, team_id)', async () => {
    const db = mockDb();
    await createPgWriter(db).upsertCompetitors(b.competitors);
    expect(db.query.mock.calls[0][0]).toMatch(/on conflict \(event_id, team_id\) do update/);
  });

  it('inserts odds without any update clause (append-only)', async () => {
    const db = mockDb();
    await createPgWriter(db).insertOdds(b.odds);
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/insert into espn\.odds_snapshots/);
    expect(sql).not.toMatch(/on conflict|update/i);
    expect(params).toHaveLength(b.odds.length * 8);
  });

  it('skips queries for empty batches', async () => {
    const db = mockDb();
    const w = createPgWriter(db);
    await w.upsertEvents([]);
    await w.upsertCompetitors([]);
    await w.insertOdds([]);
    expect(await w.latestOdds([])).toEqual(new Map());
    expect(db.query).not.toHaveBeenCalled();
  });

  it('keys latest odds by event|provider', async () => {
    const db = mockDb([{ event_id: '1', provider: 'DraftKings', spread: '-1.5' }]);
    const m = await createPgWriter(db).latestOdds(['1']);
    expect([...m.keys()]).toEqual(['1|DraftKings']);
    expect(db.query.mock.calls[0][1]).toEqual([['1']]);
  });
});
