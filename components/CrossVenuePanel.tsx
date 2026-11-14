import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, RefreshCw, ShieldAlert, ShieldCheck, WifiOff } from 'lucide-react';
import type { League } from '../types';

// One row per outcome per venue, normalized server-side by /api/arb. The point of
// this panel is not to show four price lists; it is to answer one question the four
// boards cannot answer separately: is the same claim cheaper on one exchange after
// that exchange's fee, at a size that could actually be filled?

interface Health {
  venue: string;
  ok: boolean;
  rows: number;
  note?: string;
}

interface Arb {
  event: string;
  family: string;
  side: string;
  line: number | null;
  buyVenue: string;
  buyPrice: number;
  sellVenue: string;
  sellPrice: number;
  locked: number;
  size: number;
  dollars: number;
}

interface Sheet {
  venue: string;
  event: string;
  family: string;
  side: string;
  line: number | null;
  fair: number;
  bid: number | null;
  ask: number | null;
  edgeBid: number | null;
  edgeAsk: number | null;
}

interface Comparison {
  event: string;
  family: string;
  side: string;
  line: number | null;
  venues: { venue: string; bid: number | null; ask: number | null }[];
  bestBuy: { venue: string; price: number; cost: number } | null;
  bestLay: { venue: string; price: number; cost: number } | null;
  gap: number | null;
  size: number;
}

interface Value {
  venue: string;
  event: string;
  family: string;
  side: string;
  line: number | null;
  ask: number;
  askSize: number | null;
  fair: number;
  edge: number;
  breakeven: number;
}

interface Board {
  league: string;
  now: number;
  health: Health[];
  counts: { rows: number; outcomes: number; crossVenue: number };
  arbs: Arb[];
  quotes: Sheet[];
  values: Value[];
  comparisons: Comparison[];
  note: string;
}

const VENUE_LABEL: Record<string, string> = {
  kalshi: 'Kalshi',
  polymarket: 'Polymarket',
  novig: 'Novig',
  prophetx: 'ProphetX',
};

const cents = (p: number | null) => (p === null ? '—' : `${(p * 100).toFixed(1)}¢`);
const pct = (p: number | null) => (p === null ? '—' : `${(p * 100).toFixed(2)}%`);
const signed = (line: number | null) =>
  line === null ? '' : line > 0 ? `+${line}` : String(line);
const gameLabel = (event: string) => {
  const [, ...teams] = event.split('|');
  const date = event.split('|')[0];
  return `${teams.join(' @ ')} · ${date.slice(5)}`;
};

export const CrossVenuePanel: React.FC<{ activeLeague: League }> = ({ activeLeague }) => {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const league = activeLeague === 'CFB' ? 'cfb' : 'nfl';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/arb?league=${league}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as Board;
      setBoard(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'fetch failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [league]);

  const health = board?.health ?? [];
  const arbs = board?.arbs ?? [];
  const sheets = (board?.quotes ?? []).filter((q) => q.edgeBid !== null || q.edgeAsk !== null).slice(0, 12);
  const values = (board?.values ?? []).slice(0, 10);
  const comparisons = (board?.comparisons ?? []).slice(0, 10);

  return (
    <div className="bg-[#05070a] border border-white/5 rounded-[40px] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-400">
            <ArrowRightLeft size={12} /> Cross-venue execution
          </div>
          <h3 className="text-white text-lg font-bold mt-1">
            Kalshi · Polymarket · Novig · ProphetX
          </h3>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-mono text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> refresh
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {health.map((h) => (
          <span
            key={h.venue}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider ${
              h.ok
                ? 'border-emerald-500/30 text-emerald-300'
                : 'border-amber-500/30 text-amber-300'
            }`}
            title={h.note ?? ''}
          >
            {h.ok ? <ShieldCheck size={10} /> : <WifiOff size={10} />}
            {VENUE_LABEL[h.venue] ?? h.venue}
            <span className="text-slate-500">{h.rows}</span>
          </span>
        ))}
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-rose-400">
          <ShieldAlert size={12} /> {error}
        </div>
      )}

      {board && (
        <div className="mt-1 text-[10px] font-mono text-slate-500">
          {board.counts.rows} priced rows · {board.counts.outcomes} outcomes ·{' '}
          {board.counts.crossVenue} games priced on more than one venue
        </div>
      )}

      <div className="mt-5">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">
          Locked trades after both fees
        </div>
        {arbs.length === 0 ? (
          <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
            {board?.note ?? 'No locked cross-venue trade at visible size.'}
          </p>
        ) : (
          <table className="mt-2 w-full text-left text-[11px] font-mono">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1">outcome</th>
                <th>buy</th>
                <th>lay</th>
                <th className="text-right">locked</th>
                <th className="text-right">size</th>
                <th className="text-right">$</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {arbs.map((a, i) => (
                <tr key={`${a.event}-${a.side}-${a.line}-${i}`} className="border-t border-white/5">
                  <td className="py-1.5">
                    {gameLabel(a.event)} · {a.side} {signed(a.line)}
                  </td>
                  <td>
                    {VENUE_LABEL[a.buyVenue]} {cents(a.buyPrice)}
                  </td>
                  <td>
                    {VENUE_LABEL[a.sellVenue]} {cents(a.sellPrice)}
                  </td>
                  <td className="text-right text-emerald-300">{pct(a.locked)}</td>
                  <td className="text-right">{a.size.toLocaleString()}</td>
                  <td className="text-right text-emerald-300">${a.dollars.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">
          Cheapest buy and best lay on the same claim
        </div>
        {comparisons.length === 0 ? (
          <p className="mt-2 text-[12px] text-slate-400">
            No outcome is priced on two venues with a comparable claim right now.
          </p>
        ) : (
          <table className="mt-2 w-full text-left text-[11px] font-mono">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1">outcome</th>
                <th>buy on</th>
                <th>lay on</th>
                <th className="text-right">gap</th>
                <th className="text-right">size</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {comparisons.map((c, i) => (
                <tr key={`cmp-${c.event}-${c.side}-${c.line}-${i}`} className="border-t border-white/5">
                  <td className="py-1.5">
                    {gameLabel(c.event)} · {c.side} {signed(c.line)}
                  </td>
                  <td>
                    {c.bestBuy ? `${VENUE_LABEL[c.bestBuy.venue]} ${cents(c.bestBuy.price)}` : '—'}
                  </td>
                  <td>
                    {c.bestLay ? `${VENUE_LABEL[c.bestLay.venue]} ${cents(c.bestLay.price)}` : '—'}
                  </td>
                  <td className={`text-right ${(c.gap ?? 0) > 0 ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {c.gap === null ? '—' : `${(c.gap * 100).toFixed(2)}¢`}
                  </td>
                  <td className="text-right">{c.size ? c.size.toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">
          Priced below the market's fair value, after that venue's fee
        </div>
        {values.length === 0 ? (
          <p className="mt-2 text-[12px] text-slate-400">
            No venue is offering a claim more than 2% under consensus fair value on a claim that
            at least three venues price. Single-venue disagreements are not shown: one exchange's
            resting bid is its opinion, not the market's.
          </p>
        ) : (
          <table className="mt-2 w-full text-left text-[11px] font-mono">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1">outcome</th>
                <th>venue</th>
                <th className="text-right">take</th>
                <th className="text-right">fair</th>
                <th className="text-right">edge</th>
                <th className="text-right">size</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {values.map((v, i) => (
                <tr key={`val-${v.venue}-${v.event}-${v.side}-${v.line}-${i}`} className="border-t border-white/5">
                  <td className="py-1.5">
                    {gameLabel(v.event)} · {v.side} {signed(v.line)}
                  </td>
                  <td>{VENUE_LABEL[v.venue] ?? v.venue}</td>
                  <td className="text-right">{cents(v.ask)}</td>
                  <td className="text-right">{cents(v.fair)}</td>
                  <td className="text-right text-emerald-300">+{(v.edge * 100).toFixed(1)}%</td>
                  <td className="text-right">{v.askSize ? v.askSize.toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">
          Where we could post a bid and an ask around consensus fair
        </div>
        {sheets.length === 0 ? (
          <p className="mt-2 text-[12px] text-slate-400">
            No rung has room to quote inside its own venue's touch.
          </p>
        ) : (
          <table className="mt-2 w-full text-left text-[11px] font-mono">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1">outcome</th>
                <th>venue</th>
                <th className="text-right">fair</th>
                <th className="text-right">post bid</th>
                <th className="text-right">post ask</th>
                <th className="text-right">edge</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {sheets.map((q, i) => (
                <tr key={`${q.venue}-${q.event}-${q.side}-${q.line}-${i}`} className="border-t border-white/5">
                  <td className="py-1.5">
                    {gameLabel(q.event)} · {q.side} {signed(q.line)}
                  </td>
                  <td>{VENUE_LABEL[q.venue] ?? q.venue}</td>
                  <td className="text-right">{cents(q.fair)}</td>
                  <td className="text-right">{cents(q.bid)}</td>
                  <td className="text-right">{cents(q.ask)}</td>
                  <td className="text-right text-emerald-300">
                    {q.edgeBid !== null ? `+${(q.edgeBid * 100).toFixed(1)}¢` : ''}
                    {q.edgeBid !== null && q.edgeAsk !== null ? ' / ' : ''}
                    {q.edgeAsk !== null ? `+${(q.edgeAsk * 100).toFixed(1)}¢` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-5 text-[10px] leading-relaxed text-slate-500">
        A rung only compares across venues when the claim is identical. Kalshi and Polymarket
        list spreads as "wins by over N", which is a margin band, not a cover price at a
        sportsbook number — those rows are quarantined rather than matched. Pregame Novig is
        fee-free; ProphetX charges only on winnings. Nothing here is a fill.
      </p>
    </div>
  );
};
