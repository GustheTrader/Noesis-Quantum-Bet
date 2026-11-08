import React, { useEffect, useRef, useState } from 'react';
import {
  fetchNflEvent,
  fetchNflModels,
  fetchNflScoreboard,
  formatNflStatus,
  NflBoard,
  NflGame,
  NflModelStatus,
  upstreamHealth,
} from '../lib/nfl';

export type NflHealth = 'ONLINE' | 'STALE' | 'UNAVAILABLE';

type Play = { period: number | null; clock: string | null; text: string; scoring: boolean; team: string | null };

const POLL_MS = 60_000;
const MAX_AGE_S = 120;

export const NflLiveBoard: React.FC<{ onHealth: (h: NflHealth) => void }> = ({ onHealth }) => {
  const [board, setBoard] = useState<NflBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastOkAt, setLastOkAt] = useState<Date | null>(null);
  const [models, setModels] = useState<NflModelStatus | null>(null);
  const [selected, setSelected] = useState<NflGame | null>(null);
  const [plays, setPlays] = useState<Play[] | null>(null);
  const [playsError, setPlaysError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const healthRef = useRef<NflHealth>('UNAVAILABLE');

  const load = async () => {
    try {
      const b = await fetchNflScoreboard();
      setBoard(b);
      setError(null);
      setLastOkAt(new Date());
    } catch (e: any) {
      setError(String(e?.message ?? 'upstream_unavailable'));
    }
  };

  useEffect(() => {
    load();
    fetchNflModels()
      .then(setModels)
      .catch(() => setModels({ status: 'unavailable', reason: 'no_running_nfl_model', predictions: [] }));
    const poll = setInterval(() => {
      load();
      setNow(new Date());
    }, POLL_MS);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    const h = upstreamHealth({ lastOkAt, now, maxAgeSeconds: MAX_AGE_S });
    if (h !== healthRef.current) {
      healthRef.current = h;
      onHealth(h);
    }
  }, [lastOkAt, now]);

  const openEvent = async (g: NflGame) => {
    setSelected(g);
    setPlays(null);
    setPlaysError(null);
    try {
      const r = await fetchNflEvent(g.event_id);
      setPlays(r.plays ?? []);
    } catch (e: any) {
      setPlaysError(String(e?.message ?? 'upstream_unavailable'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-[#0a0e17] p-4 text-[11px] font-mono uppercase tracking-widest text-slate-400">
        ESPN scoreboard · scores and clock only · not betting odds
        {board && <span className="ml-3 text-slate-500">as of {new Date(board.fetched_at).toLocaleTimeString()}</span>}
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-300">
          ESPN scoreboard unavailable ({error}). No games are shown rather than a fallback slate.
        </div>
      )}

      {board && board.games.length === 0 && !error && (
        <div className="rounded-xl border border-white/10 p-4 text-sm text-slate-400">ESPN returned no NFL events for the current window.</div>
      )}

      <div className="divide-y divide-white/5 rounded-xl border border-white/10">
        {board?.games.map((g) => (
          <button
            key={g.event_id}
            onClick={() => openEvent(g)}
            className="grid w-full grid-cols-12 items-center gap-2 p-4 text-left hover:bg-white/[0.03]"
          >
            <div className="col-span-5 text-sm text-white">
              <div>{g.away.name} <span className="font-black">{g.away.score}</span></div>
              <div>{g.home.name} <span className="font-black">{g.home.score}</span></div>
            </div>
            <div className="col-span-4 text-xs text-slate-300">{formatNflStatus(g)}{g.clock && g.state === 'in' ? ` · ${g.clock}` : ''}</div>
            <div className="col-span-3 text-right text-[10px] uppercase tracking-widest text-emerald-400">View plays</div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="rounded-xl border border-white/10 p-4">
          <div className="mb-3 text-xs font-mono uppercase tracking-widest text-slate-400">
            Play-by-play · {selected.away.abbr} @ {selected.home.abbr} · ESPN event {selected.event_id}
          </div>
          {playsError && <div className="text-sm text-amber-300">Play-by-play unavailable ({playsError}).</div>}
          {!playsError && plays === null && <div className="text-sm text-slate-400">Loading…</div>}
          {plays && plays.length === 0 && <div className="text-sm text-slate-400">ESPN has no plays for this event yet.</div>}
          {plays && plays.length > 0 && (
            <ol className="max-h-96 space-y-2 overflow-y-auto text-sm text-slate-200">
              {plays.slice(-40).reverse().map((p, i) => (
                <li key={i} className={p.scoring ? 'text-emerald-300' : ''}>
                  <span className="font-mono text-[11px] text-slate-500">Q{p.period ?? '?'} {p.clock ?? ''}</span> {p.text}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="rounded-xl border border-white/10 p-4 text-sm">
        <div className="mb-2 text-xs font-mono uppercase tracking-widest text-slate-400">NFL model output</div>
        {models?.status === 'ok' ? (
          <ul className="space-y-1 text-slate-200">
            {models.predictions.map((p) => (
              <li key={p.event_id}>{p.event_id}: home win {(p.home_win_prob * 100).toFixed(1)}% · {p.model} {p.version}</li>
            ))}
          </ul>
        ) : (
          <div className="text-slate-400">
            Unavailable ({models?.reason ?? 'checking'}). No NFL model is running, so there are no predictions and none are estimated here.
          </div>
        )}
      </div>
    </div>
  );
};
