import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import {
  getNovigLeague,
  probToAmerican,
  probToPercent,
  fairPrice,
  type NovigBook,
  type NovigEvent,
  type NovigPrice,
} from '../lib/novig';

// Novig is the price source for the live college board: a peer-to-peer exchange where
// every contract trades 0..1, so the price IS the implied probability. No vig to strip.
// The catalog read is unsigned, so this renders without an account or an API key.

const SIDE_BY_TYPE: Record<string, string> = {
  SPREAD: 'Spread',
  MONEY: 'Moneyline',
  TOTAL: 'Total',
  SPREAD_1H: '1H Spread',
  TOTAL_1H: '1H Total',
  TEAM_TOTAL: 'Team Total',
};


const pickType = (ev: NovigEvent, type: string): NovigPrice | undefined =>
  ev.markets.find((m) => m.marketType === type);

// A Novig event carries one market per number, so the first TOTAL is one of a ladder of
// fifteen. The card picks the strike nearest the yes-probability, which is where the two
// sides meet: price above 50% means Over, below means Under.
const sidesMeet = (m: NovigPrice): number => {
  const prices = m.outcomes.map((o) => o.price).filter(Number.isFinite);
  return prices.length === 2 ? Math.abs(prices[0] - 0.5) : Number.POSITIVE_INFINITY;
};

const mainMarket = (ev: NovigEvent, type: string): NovigPrice | undefined => {
  const ladder = ev.markets.filter((m) => m.marketType === type);
  if (ladder.length === 0) return undefined;
  return ladder.reduce((best, m) => (sidesMeet(m) < sidesMeet(best) ? m : best));
};

const cleanName = (name: string, type: string): string => {
  const stripped = name
    .replace(/\s*[+-]?\d+(\.\d+)?\s*/g, ' ')
    .replace(/\b(OVER|UNDER|TEAM_TOTAL|SPREAD|TOTAL|MONEY|1H)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (type === 'TOTAL' || type === 'TOTAL_1H') return stripped || name.split(/\s/)[0];
  return stripped || name;
};

/** A two-sided contract shown as the price to buy each side, plus the fair mid. */
function SideRow({ market, type }: { market: NovigPrice; type: string }) {
  const fair = fairPrice(market);
  return (
    <div className="py-5 border-b border-white/5 last:border-0">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-black uppercase tracking-[0.2em] text-slate-300">{SIDE_BY_TYPE[type] ?? type}</span>
        <span className="text-[14px] font-mono text-violet-300/90">
          mid {fair != null ? probToPercent(fair) : '—'} · {market.description}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {market.outcomes.map((o) => (
          <div
            key={o.name}
            title={`${probToPercent(o.price)} implied · ${o.qty.toLocaleString()} resting`}
            className="flex items-center justify-between gap-3 bg-white/5 border border-white/5 rounded-xl px-4 py-3 min-h-[52px]"
          >
            <span className="text-[16px] font-mono text-slate-100 truncate">{cleanName(o.name, type)}</span>
            <span className="text-[20px] font-mono font-black text-emerald-300">{probToAmerican(o.price)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceRow({ label, market }: { label: string; market?: NovigPrice }) {
  const fair = market ? fairPrice(market) : undefined;
  const legs = market?.outcomes || [];
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/5 last:border-0">
      <span className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 w-28 shrink-0">{label}</span>
      {legs.length === 0 ? (
        <span className="text-[16px] font-mono text-slate-600">—</span>
      ) : (
        <div className="flex items-center gap-2 flex-1 justify-end">
          {legs.map((o) => (
            <span
              key={o.name}
              title={`${probToPercent(o.price)} · ${o.qty.toLocaleString()} resting`}
              className="flex items-center justify-between gap-3 text-[16px] font-mono text-slate-200 bg-white/5 border border-white/5 rounded-xl px-4 py-3.5 min-h-[56px]"
            >
              <span className="text-slate-400 text-[13px]">{o.name}</span>
              <span className="text-emerald-400 font-black text-[18px]">{probToAmerican(o.price)}</span>
            </span>
          ))}
          {fair != null && (
            <span className="text-[14px] font-mono text-violet-300/80 w-16 text-right" title="Fair mid (side-normalised)">
              {probToPercent(fair)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export const NovigBoard: React.FC = () => {
  const [book, setBook] = useState<NovigBook | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [pair, setPair] = useState<string>('');

  const load = async () => {
    setLoading(true);
    try {
      const b = await getNovigLeague('NCAAF');
      setBook(b);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Novig catalog unreachable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const poll = setInterval(load, 60000);
    return () => clearInterval(poll);
  }, []);

  // Events with no description on the wire (some futures and boosters) carry no teams, so
  // they cannot be labelled or paired with a game. Keep them out of the selector.
  const events = (book?.events || []).filter((e) => /\S/.test(e.description || '') && e.markets.length > 0);
  // Priced first: an event whose book is still empty has nothing to show.
  const priced = events.filter((e) => e.markets.some((m) => m.outcomes.some((o) => Number.isFinite(o.price))));
  const isMatchup = (e: NovigEvent) => /\s@\s|\sAT\s/.test(e.description || '');
  const matchups = priced.filter(isMatchup);
  const selected = priced.find((e) => e.eventId === pair) || matchups[0] || priced[0] || events[0];
  const volume = events.reduce((acc, e) => acc + e.markets.reduce((s, m) => s + (m.volume || 0), 0), 0);

  return (
    <div className="bg-[#05070a] rounded-[32px] overflow-hidden border border-violet-500/20 relative shadow-[0_40px_120px_rgba(139,92,246,0.12)] mb-10">
      <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-violet-950/10">
        <div className="flex items-center gap-4">
          <Activity size={22} className="text-violet-400" />
          <div>
            <div className="text-[18px] font-black uppercase tracking-[0.28em] text-violet-100">Novig Exchange · NCAAF</div>
            <div className="text-[14px] font-mono text-slate-400 mt-1.5">
              {events.length} events · {events.reduce((a, e) => a + e.markets.length, 0)} contracts · {volume.toLocaleString()} volume · {book?.level ?? 'paper'}
            </div>
          </div>
        </div>
        <button onClick={load} className="p-3 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="px-10 py-10 text-[15px] font-mono text-rose-400">Feed error: {error}</div>
      )}

      {!error && events.length === 0 && !loading && (
        <div className="px-10 py-10 text-[15px] font-mono text-slate-500">No NCAAF contracts listed right now.</div>
      )}

      {events.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,26rem)_1fr]">
          <div className="max-h-[36rem] overflow-y-auto border-r border-white/5 divide-y divide-white/5">
            {events.map((ev) => (
              <button
                key={ev.eventId}
                onClick={() => setPair(ev.eventId)}
                className={`w-full text-left px-4 py-4 transition-colors ${
                  selected?.eventId === ev.eventId ? 'bg-violet-500/10' : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="text-[15px] font-black text-white uppercase tracking-wide leading-tight">{ev.description || 'Unnamed event'}</div>
                <div className="text-[13px] font-mono text-slate-500 mt-1.5">
                  {ev.markets.length} markets · {new Date(ev.startsTs).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="p-10">
              <div className="text-[20px] font-black uppercase tracking-[0.2em] text-white mb-1">{selected.description}</div>
              <div className="text-[13px] font-mono text-slate-500 mb-6">
                Kicks {new Date(selected.startsTs).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-14">
                {['SPREAD', 'MONEY', 'TOTAL', 'SPREAD_1H', 'TOTAL_1H', 'TEAM_TOTAL'].map((type) => {
                  const m = mainMarket(selected, type);
                  if (!m) return null;
                  return <SideRow key={type} market={m} type={type} />;
                })}
              </div>
              <div className="mt-6 text-[13px] font-mono text-slate-500 leading-relaxed">
                Prices are resting bids in probability terms (0–1) converted to American odds. Fair mid is the
                side-normalised probability; a 0.50 / 0.49 book means the exchange has no spread to give away.
                Fees: taker {selected.markets[0]?.marketType ? '6% of winnings on live fills' : '—'}.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
