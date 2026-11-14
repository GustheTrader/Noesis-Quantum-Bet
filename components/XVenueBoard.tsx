import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowLeftRight, CheckCircle2, RefreshCw } from 'lucide-react';
import type { League } from '../types';
import {
  VENUES,
  IMPLAUSIBLE_GAP,
  capitalFor,
  type Arb,
  type QuoteSheet,
  type Row,
  type Venue,
} from '../lib/xvenue';

// Four prediction exchanges, one board. Novig and ProphetX quote a team's own signed
// spread; Kalshi and Polymarket list "wins by over X.5" rungs, which are margin bands,
// not covers — lib/xvenue keys those separately so the two never get compared.
//
// The only number worth reading here is `locked`: profit per $1 of contract after both
// venues' fees. Everything else is context.

const VENUE_LABEL: Record<Venue, string> = {
  novig: 'Novig',
  prophetx: 'ProphetX',
  kalshi: 'Kalshi',
  polymarket: 'Polymarket',
};

const VENUE_TONE: Record<Venue, string> = {
  novig: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/5',
  prophetx: 'text-violet-300 border-violet-500/30 bg-violet-500/5',
  kalshi: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/5',
  polymarket: 'text-amber-300 border-amber-500/30 bg-amber-500/5',
};

interface Health {
  venue: Venue;
  ok: boolean;
  rows: number;
  note?: string;
}

interface Board {
  league: string;
  now: number;
  health: Health[];
  counts: { rows: number; outcomes: number; crossVenue: number };
  arbs: Arb[];
  quotes: QuoteSheet[];
  rows?: Row[];
  note: string;
}

const pct = (x: number | null | undefined, digits = 1) =>
  x === null || x === undefined || !Number.isFinite(x) ? '—' : `${(x * 100).toFixed(digits)}%`;

const money = (x: number) =>
  Number.isFinite(x) ? `$${x.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—';

const lineLabel = (family: string, line: number | null, side: string) => {
  if (family === 'ML') return `${side} ML`;
  if (line === null) return `${side} ${family.toLowerCase()}`;
  return `${side} ${line > 0 ? '+' : ''}${line}`;
};

const venueFor = (league: League): string => {
  const key = league === 'NFL' || league === 'CFB' ? league.toLowerCase() : 'nfl';
  return `/api/arb?league=${key}`;
};

export const XVenueBoard: React.FC<{ activeLeague: League }> = ({ activeLeague }) => {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuotes, setShowQuotes] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(venueFor(activeLeague), { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as Board;
      setBoard(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'fetch failed');
    } finally {
      setLoading(false);
    }
  }, [activeLeague]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 20_000);
    return () => clearInterval(id);
  }, [load]);

  const quotes = useMemo(
    () =>
      (board?.quotes ?? [])
        .filter((q) => q.bid !== null || q.ask !== null)
        .sort((a, b) => (b.edgeAsk ?? 0) + (b.edgeBid ?? 0) - ((a.edgeAsk ?? 0) + (a.edgeBid ?? 0)))
        .slice(0, showQuotes ? 40 : 8),
    [board, showQuotes],
  );

  const arbs = board?.arbs ?? [];
  const live = (board?.health ?? []).filter((h) => h.ok).length;

  return (
    <section className="bg-[#05070a] rounded-[40px] border border-white/5 p-6 md:p-8 shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
            <ArrowLeftRight className="w-3.5 h-3.5" /> Cross-venue desk
          </div>
          <h3 className="text-xl font-black text-white italic uppercase tracking-tight mt-1">
            Kalshi · Polymarket · Novig · ProphetX
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            {live}/{VENUES.length} venues · {board?.counts.rows ?? 0} quotes ·{' '}
            {board?.counts.crossVenue ?? 0} games priced twice
          </span>
          <button
            onClick={() => void load()}
            className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/25 transition"
            aria-label="Refresh cross-venue board"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        {(board?.health ?? []).map((h) => (
          <div
            key={h.venue}
            className={`rounded-2xl border px-3 py-2 ${
              h.ok ? VENUE_TONE[h.venue] : 'border-slate-800 text-slate-600 bg-slate-900/20'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider">
              {h.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {VENUE_LABEL[h.venue]}
            </div>
            <div className="text-[10px] font-mono mt-0.5 opacity-70">
              {h.ok ? `${h.rows} rows` : h.note ?? 'unavailable'}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-[11px] font-mono text-amber-300 mb-6">
          board fetch failed: {error}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
          <Activity className="w-3.5 h-3.5" /> Locked trades
        </div>
        <span className="text-[10px] font-mono text-slate-600">
          gap &gt; {(IMPLAUSIBLE_GAP * 100).toFixed(0)}% treated as a data bug
        </span>
      </div>

      {arbs.length === 0 ? (
        <p className="text-[12px] text-slate-500 leading-relaxed mb-8">
          {board?.note ?? 'Loading…'}
        </p>
      ) : (
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-500 font-black">
                <th className="text-left py-2 pr-4">Game</th>
                <th className="text-left py-2 pr-4">Side</th>
                <th className="text-left py-2 pr-4">Buy</th>
                <th className="text-left py-2 pr-4">Sell</th>
                <th className="text-right py-2 pr-4">Locked</th>
                <th className="text-right py-2 pr-4">Size</th>
                <th className="text-right py-2">Capital → profit</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {arbs.map((a, i) => {
                const cap = capitalFor(a);
                return (
                  <tr key={`${a.event}-${a.side}-${i}`} className="border-t border-white/5">
                    <td className="py-2 pr-4 text-slate-300">{a.event.replace(/\|/g, ' ')}</td>
                    <td className="py-2 pr-4 text-white font-bold">
                      {lineLabel(a.family, a.line, a.side)}
                    </td>
                    <td className="py-2 pr-4 text-cyan-300">
                      {VENUE_LABEL[a.buyVenue]} {pct(a.buyPrice)}
                    </td>
                    <td className="py-2 pr-4 text-violet-300">
                      {VENUE_LABEL[a.sellVenue]} {pct(a.sellPrice)}
                    </td>
                    <td className="py-2 pr-4 text-right text-emerald-400 font-bold">
                      {pct(a.locked, 2)}
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-400">{a.size.toLocaleString()}</td>
                    <td className="py-2 text-right text-slate-300">
                      {money(cap.outlay)} → {money(cap.profit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
          Maker quotes vs consensus
        </div>
        <button
          onClick={() => setShowQuotes((v) => !v)}
          className="text-[10px] font-mono uppercase tracking-widest text-slate-500 hover:text-white"
        >
          {showQuotes ? 'show less' : 'show more'}
        </button>
      </div>
      <p className="text-[11px] text-slate-600 mb-3 leading-relaxed">
        Where you could post a two-sided market around the median mid across venues. A quote is
        blank on a side where it would cross the venue's own book — posting into a resting order
        fills you as a taker at a worse price.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-slate-500 font-black">
              <th className="text-left py-2 pr-4">Venue</th>
              <th className="text-left py-2 pr-4">Market</th>
              <th className="text-right py-2 pr-4">Fair</th>
              <th className="text-right py-2 pr-4">Post bid</th>
              <th className="text-right py-2 pr-4">Post ask</th>
              <th className="text-right py-2">Capture</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {quotes.map((q, i) => (
              <tr key={`${q.venue}-${q.event}-${q.side}-${q.line}-${i}`} className="border-t border-white/5">
                <td className="py-2 pr-4">
                  <span className={`px-1.5 py-0.5 rounded border text-[10px] ${VENUE_TONE[q.venue]}`}>
                    {VENUE_LABEL[q.venue]}
                  </span>
                </td>
                <td className="py-2 pr-4 text-slate-300">
                  {q.event.replace(/\|/g, ' ')} · {lineLabel(q.family, q.line, q.side)}
                </td>
                <td className="py-2 pr-4 text-right text-slate-200">{pct(q.fair)}</td>
                <td className="py-2 pr-4 text-right text-cyan-300">{pct(q.bid)}</td>
                <td className="py-2 pr-4 text-right text-violet-300">{pct(q.ask)}</td>
                <td className="py-2 text-right text-slate-400">
                  {q.bid === null || q.ask === null ? 'one-sided' : pct(q.ask - q.bid, 2)}
                </td>
              </tr>
            ))}
            {quotes.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-slate-600">
                  No outcome is priced on two venues yet, so there is no consensus to quote around.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
