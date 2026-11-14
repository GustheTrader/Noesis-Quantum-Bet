import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowRightLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import { capitalFor, FEES, type Arb, type QuoteSheet, type Venue } from '../lib/xvenue';
import type { League } from '../types';

// Four prediction exchanges priced on the same instrument. Everything here comes
// from /api/arb, which normalizes Kalshi, Polymarket, Novig and ProphetX into one
// row shape and compares them after each venue's own fee. A locked trade only
// exists when buying on one venue and laying on another costs less than $1
// together, at a size both sides actually show.

interface Health {
  venue: Venue;
  ok: boolean;
  rows: number;
  note?: string;
}

interface ArbResponse {
  league: string;
  now: number;
  health: Health[];
  counts: { rows: number; outcomes: number; crossVenue: number };
  arbs: Arb[];
  quotes: QuoteSheet[];
  note: string;
}

const LABEL: Record<Venue, string> = {
  kalshi: 'Kalshi',
  polymarket: 'Polymarket',
  novig: 'Novig',
  prophetx: 'ProphetX',
};

const FEE_SHAPE: Record<Venue, string> = {
  kalshi: '7¢/contract',
  polymarket: '5¢ taker',
  novig: 'free pregame',
  prophetx: '3% notional',
};

const pct = (x: number | null | undefined, digits = 1) =>
  x === null || x === undefined || !Number.isFinite(x) ? '—' : `${(x * 100).toFixed(digits)}%`;

const money = (x: number) =>
  x >= 1000 ? `$${(x / 1000).toFixed(1)}k` : `$${x.toFixed(0)}`;

const sideLabel = (a: { event: string; side: string; line: number | null }) => {
  const [, away, home] = a.event.split('|');
  const signed = a.line === null ? '' : a.line > 0 ? ` +${a.line}` : ` ${a.line}`;
  const vs = away && home ? `${away} @ ${home}` : a.event;
  return `${a.side}${signed} · ${vs}`;
};

export const CrossVenueBoard: React.FC<{ league: League }> = ({ league }) => {
  const key = league === 'CFB' ? 'cfb' : league === 'NFL' ? 'nfl' : null;
  const [data, setData] = useState<ArbResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuotes, setShowQuotes] = useState(false);

  const load = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/arb?league=${key}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as ArbResponse);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const quotes = useMemo(() => (data?.quotes ?? []).filter((q) => q.bid !== null || q.ask !== null).slice(0, 40), [data]);

  if (!key) return null;

  return (
    <div className="bg-[#05070a] rounded-[56px] overflow-hidden border border-white/5 shadow-[0_40px_120px_rgba(0,0,0,0.6)] mb-10">
      <div className="px-8 pt-7 pb-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-3 text-white tracking-[0.24em] text-[10px] font-black">
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            CROSS-VENUE EXECUTION
          </div>
          <p className="text-slate-500 text-[11px] mt-2 max-w-xl leading-relaxed">
            Same outcome, four exchanges, priced after each venues own fee. A locked row means buying one leg here and
            laying it there costs less than $1 together, at the size both sides actually show.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-slate-400 hover:text-white border border-white/10 rounded-full px-4 py-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          REFRESH
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5 border-b border-white/5">
        {(data?.health ?? []).map((h) => (
          <div key={h.venue} className="px-6 py-4">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${h.ok ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <span className="text-white text-[11px] font-black tracking-[0.18em]">{LABEL[h.venue]}</span>
            </div>
            <div className="text-slate-500 text-[10px] mt-1.5 font-mono">
              {h.ok ? `${h.rows} quotes` : h.note ?? 'unavailable'}
            </div>
            <div className="text-slate-600 text-[9px] mt-0.5 tracking-wider uppercase">{FEE_SHAPE[h.venue]}</div>
          </div>
        ))}
        {!data && !error && (
          <div className="col-span-4 px-6 py-6 text-slate-500 text-[11px]">Probing venues…</div>
        )}
      </div>

      <div className="px-8 py-6">
        {error && (
          <div className="flex items-center gap-3 text-rose-400 text-[11px] font-mono">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {data && data.arbs.length === 0 && !error && (
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-white text-[12px] font-bold tracking-wide">No locked trade at visible size</div>
              <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">{data.note}</p>
              <p className="text-slate-600 text-[10px] mt-2 font-mono">
                {data.counts.rows} quotes · {data.counts.outcomes} outcomes · {data.counts.crossVenue} games with more
                than one venue
              </p>
            </div>
          </div>
        )}

        {data && data.arbs.length > 0 && (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left border-separate border-spacing-y-1">
              <thead>
                <tr className="text-slate-500 text-[9px] tracking-[0.2em] uppercase">
                  <th className="px-3 py-2">Outcome</th>
                  <th className="px-3 py-2">Buy</th>
                  <th className="px-3 py-2">Lay</th>
                  <th className="px-3 py-2 text-right">Locked</th>
                  <th className="px-3 py-2 text-right">Size</th>
                  <th className="px-3 py-2 text-right">Capital</th>
                  <th className="px-3 py-2 text-right">Profit</th>
                  <th className="px-3 py-2 text-right">ROI</th>
                </tr>
              </thead>
              <tbody>
                {data.arbs.map((a, i) => {
                  const cap = capitalFor(a);
                  return (
                    <tr key={`${a.event}-${a.side}-${a.line}-${i}`} className="bg-white/[0.02]">
                      <td className="px-3 py-3 text-white text-[11px] font-bold whitespace-nowrap">{sideLabel(a)}</td>
                      <td className="px-3 py-3 text-[11px] font-mono text-cyan-300">
                        {LABEL[a.buyVenue]} {pct(a.buyPrice, 1)}
                      </td>
                      <td className="px-3 py-3 text-[11px] font-mono text-fuchsia-300">
                        {LABEL[a.sellVenue]} {pct(a.sellPrice, 1)}
                      </td>
                      <td className="px-3 py-3 text-right text-[11px] font-mono text-emerald-400 font-bold">
                        {pct(a.locked, 2)}
                      </td>
                      <td className="px-3 py-3 text-right text-[11px] font-mono text-slate-300">
                        {a.size.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right text-[11px] font-mono text-slate-300">{money(cap.outlay)}</td>
                      <td className="px-3 py-3 text-right text-[11px] font-mono text-emerald-400">{money(cap.profit)}</td>
                      <td className="px-3 py-3 text-right text-[11px] font-mono text-emerald-300">{pct(cap.roi, 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-amber-400/70 text-[10px] mt-4 font-mono leading-relaxed">
              Both legs must still be live when you send them. Size is what the resting book shows, not a guarantee of
              fill; a fee tier you have not confirmed can erase a thin lock.
            </p>
          </div>
        )}

        {data && quotes.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowQuotes((v) => !v)}
              className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-slate-400 hover:text-white transition"
            >
              <Activity className="w-3.5 h-3.5" />
              {showQuotes ? 'HIDE' : 'SHOW'} MAKER QUOTES ({quotes.length})
            </button>
            {showQuotes && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-1">
                  <thead>
                    <tr className="text-slate-500 text-[9px] tracking-[0.2em] uppercase">
                      <th className="px-3 py-2">Venue</th>
                      <th className="px-3 py-2">Outcome</th>
                      <th className="px-3 py-2 text-right">Fair</th>
                      <th className="px-3 py-2 text-right">Post bid</th>
                      <th className="px-3 py-2 text-right">Post ask</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((q, i) => (
                      <tr key={`${q.venue}-${q.event}-${q.side}-${q.line}-${i}`} className="bg-white/[0.02]">
                        <td className="px-3 py-2 text-[10px] font-black tracking-wider text-slate-300">
                          {LABEL[q.venue]}
                        </td>
                        <td className="px-3 py-2 text-[10px] text-white whitespace-nowrap">{sideLabel(q)}</td>
                        <td className="px-3 py-2 text-right text-[10px] font-mono text-slate-300">{pct(q.fair)}</td>
                        <td className="px-3 py-2 text-right text-[10px] font-mono text-cyan-300">{pct(q.bid)}</td>
                        <td className="px-3 py-2 text-right text-[10px] font-mono text-fuchsia-300">{pct(q.ask)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-slate-600 text-[10px] mt-3 font-mono">
                  Fair is the median mid across venues quoting that exact outcome. A posted price that would cross the
                  venues own book is left blank rather than shown as a quote you cannot get filled.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
