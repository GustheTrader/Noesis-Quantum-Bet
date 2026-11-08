import React, { useEffect, useState } from 'react';
import { Activity, Calendar, Radio, RefreshCw, AlertTriangle, MapPin } from 'lucide-react';
import { clsx } from 'clsx';
import { getLiveWeek, type CfbGame } from '../lib/cfb';

/**
 * The CFB equivalent of the NFL "Whale Bets" stack: the slate that is actually on the
 * board right now. ESPN's free college feed publishes game state but no closing lines,
 * so each card shows the matchup, kickoff, live score and status, and says NL for price
 * instead of inventing a spread the grader would then score as real.
 */
export const CfbSlate: React.FC = () => {
  const [games, setGames] = useState<CfbGame[]>([]);
  const [week, setWeek] = useState('');
  const [season, setSeason] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<Date>(new Date());

  const load = async (force = false) => {
    try {
      const live = await getLiveWeek(force);
      setGames(live.games);
      setWeek(live.weekLabel);
      setSeason(live.season);
      setError(null);
      setUpdated(new Date());
    } catch (e: any) {
      setError(e?.message || 'ESPN feed unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const poll = setInterval(() => load(true), 60_000);
    return () => clearInterval(poll);
  }, []);

  const liveCount = games.filter((g) => !g.completed && /quarter|half|ot|in progress|delay/i.test(g.status)).length;
  const sorted = [...games].sort((a, b) => {
    const rank = (g: CfbGame) => (g.completed ? 2 : /quarter|half|ot|in progress/i.test(g.status) ? 0 : 1);
    return rank(a) - rank(b) || a.kickoff.localeCompare(b.kickoff);
  });

  return (
    <div>
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <span className="text-violet-400 font-serif italic">Live</span> College Slate
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {season ? `${season} season` : 'Current season'} · {week || 'current week'} · {games.length} games
            {liveCount > 0 ? ` · ${liveCount} in progress` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full">
            <div className={clsx('w-2 h-2 rounded-full', liveCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600')} />
            <span className="text-[10px] font-black uppercase text-violet-300 tracking-wider">
              {liveCount > 0 ? 'Live feed' : 'Feed idle'}
            </span>
          </div>
          <button
            onClick={() => load(true)}
            disabled={loading}
            className="p-3 rounded-2xl border border-white/10 text-slate-400 hover:text-white hover:border-white/30 transition-all"
            title="Refresh slate"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 flex items-center gap-3 p-5 rounded-3xl border border-amber-500/30 bg-amber-500/5 text-amber-300 text-xs font-mono">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sorted.map((g) => {
          const live = !g.completed && /quarter|half|ot|in progress|delay/i.test(g.status);
          return (
            <div
              key={g.id}
              className={clsx(
                'rounded-[32px] border p-6 bg-[#05070a] transition-all',
                live ? 'border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.08)]' : 'border-white/5'
              )}
            >
              <div className="flex items-center justify-between mb-5">
                <span className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                  <Calendar size={12} />
                  {new Date(g.kickoff || g.date).toLocaleString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                <span
                  className={clsx(
                    'text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border',
                    live
                      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                      : g.completed
                        ? 'text-slate-500 border-white/10'
                        : 'text-slate-400 border-white/10'
                  )}
                >
                  {g.status}
                </span>
              </div>

              {[g.away, g.home].map((team, i) => (
                <div key={team.id + i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={team.logo} alt="" className="w-8 h-8 object-contain shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white uppercase tracking-tight truncate">{team.name}</div>
                      <div className="text-[9px] font-mono text-slate-600 uppercase">{i === 0 ? 'Away' : 'Home'}</div>
                    </div>
                  </div>
                  <div
                    className={clsx(
                      'font-mono font-black text-2xl tabular-nums',
                      team.winner ? 'text-emerald-400' : 'text-slate-300'
                    )}
                  >
                    {team.score}
                  </div>
                </div>
              ))}

              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-[9px] font-mono uppercase tracking-widest">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <MapPin size={11} /> {g.venue || 'Venue TBD'}
                </span>
                <span className="text-slate-600">Line: NL</span>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && games.length === 0 && !error && (
        <div className="py-24 text-center text-slate-600 text-xs font-mono uppercase tracking-[0.3em]">
          No games on the current slate.
        </div>
      )}

      <div className="mt-8 flex items-center justify-between text-[9px] font-mono text-slate-600 uppercase tracking-widest">
        <span className="flex items-center gap-2">
          <Activity size={12} /> Source: ESPN college football scoreboard
        </span>
        <span className="flex items-center gap-2">
          <Radio size={12} /> Updated {updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};
