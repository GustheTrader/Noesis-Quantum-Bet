import React, { useState, useEffect } from 'react';
import { X, Cpu, ExternalLink, Zap, Fingerprint, Satellite, Radio } from 'lucide-react';
import { clsx } from 'clsx';
import { League } from '../types';
import { getGameDetail, type CfbDetail, type CfbPlay } from '../lib/cfb';

interface ArchiveMatchup {
  id: string;
  league: League;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  finalScore: { away: string; home: string };
}

interface CfbArchiveDrawerProps {
  game: ArchiveMatchup;
  onClose: () => void;
  accent: string;
}

/**
 * 2006 CFB replacement for the live play-by-play drawer. The live drawer polls ESPN every
 * 10s for a game that is happening now; these games finished two decades ago, so this
 * fetches the summary once and renders the half-by-half log that ESPN kept for 2006 —
 * per-play text survives only for drives, so the log is one row per quarter.
 */
export const CfbArchiveDrawer: React.FC<CfbArchiveDrawerProps> = ({ game, onClose, accent }) => {
  const [detail, setDetail] = useState<CfbDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    setError(null);
    getGameDetail(game.id)
      .then((d) => {
        if (cancelled) return;
        if (!d) setError('ESPN has no summary archived for this event.');
        setDetail(d);
      })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Summary fetch failed'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [game.id]);

  const stats = detail?.teamStats || [];
  const statValue = (teamName: string, key: string) =>
    stats.find((s) => s.team === teamName)?.stats?.[key];

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" onClick={onClose}></div>
      <div className="fixed inset-y-0 right-0 w-full md:w-[550px] bg-[#05070a] border-l border-white/10 z-[100] flex flex-col animate-in slide-in-from-right duration-500 ease-out overflow-hidden">
        <div className={clsx('absolute top-0 left-0 right-0 h-1 z-[60]', `bg-${accent}-500/30`)}></div>

        <div className="p-8 border-b border-white/10 flex justify-between items-center bg-[#080a0f]/80 backdrop-blur-md">
          <div className="flex items-center gap-5">
            <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center border', `bg-${accent}-500/10 border-${accent}-500/40`)}>
              <Fingerprint size={32} className={clsx(`text-${accent}-400 animate-pulse`)} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Archive_Replay</span>
                <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Box Score Intel</h2>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all">
            <X size={32} />
          </button>
        </div>

        <div className="px-8 py-10 border-b border-white/5 bg-black/40">
          <div className="grid grid-cols-11 items-center">
            <div className="col-span-4 text-center">
              <div className="w-24 h-24 p-4 bg-black/40 rounded-[32px] border border-white/10 mx-auto mb-4">
                <img src={game.awayLogo} className="w-full h-full object-contain" alt="" />
              </div>
              <div className="text-6xl font-black text-white font-mono tracking-tighter leading-none mb-2">{game.finalScore.away}</div>
              <div className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">{game.awayTeam}</div>
            </div>
            <div className="col-span-3 flex flex-col items-center">
              <div className="w-full bg-[#0a0c14] border border-white/10 rounded-2xl p-4 text-center">
                <div className="text-2xl font-mono font-black tracking-widest text-slate-500">FINAL</div>
                <div className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] mt-1">{detail?.game.week || '2006'}</div>
              </div>
              <span className="text-[10px] font-black text-slate-700 tracking-[0.5em] mt-6">ARCHIVED</span>
            </div>
            <div className="col-span-4 text-center">
              <div className="w-24 h-24 p-4 bg-black/40 rounded-[32px] border border-white/10 mx-auto mb-4">
                <img src={game.homeLogo} className="w-full h-full object-contain" alt="" />
              </div>
              <div className="text-6xl font-black text-white font-mono tracking-tighter leading-none mb-2">{game.finalScore.home}</div>
              <div className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">{game.homeTeam}</div>
            </div>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-8 space-y-6 bg-[#020408]">
          {loading && (
            <div className="flex flex-col items-center justify-center py-40 text-slate-700 gap-4">
              <Cpu size={48} className="animate-spin text-indigo-500/40" />
              <span className="text-[10px] uppercase font-black tracking-[0.5em] animate-pulse">Loading ESPN archive...</span>
            </div>
          )}

          {!loading && error && (
            <div className="py-32 text-center">
              <Satellite size={64} strokeWidth={1} className="opacity-20 mx-auto mb-6 text-slate-600" />
              <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-600">{error}</p>
            </div>
          )}

          {!loading && detail && (
            <>
              <div className="flex items-center gap-3 sticky top-0 bg-[#020408]/90 backdrop-blur-sm py-2">
                <Radio size={14} className="text-emerald-500" />
                <span className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Quarter Log</span>
                <span className="text-[10px] font-mono text-slate-600">{detail.scoringPlays.length} scoring plays</span>
              </div>

              {detail.plays.length === 0 && (
                <p className="text-[11px] text-slate-600 font-mono leading-relaxed">
                  ESPN kept no play-level text for 2006 events. Quarter scores and the final box score below are the full record.
                </p>
              )}

              {quarterRows(detail).map((row) => (
                <div key={row.period} className="flex items-center justify-between border-l border-slate-800 pl-6 py-4">
                  <span className="text-[11px] font-mono bg-black/60 px-3 py-1 rounded-full border border-white/10 text-indigo-400 font-black">
                    {row.period === 0 ? 'FINAL' : `Q${row.period}`}
                  </span>
                  <span className="font-mono font-black text-white">
                    {detail.game.away.abr} {row.away} — {detail.game.home.abr} {row.home}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {row.away > row.home ? detail.game.away.abr : row.home > row.away ? detail.game.home.abr : 'TIE'}
                  </span>
                </div>
              ))}

              {detail.scoringPlays.length > 0 && (
                <>
                  <div className="text-[11px] font-black text-white uppercase tracking-[0.4em] pt-6">Scoring Sequence</div>
                  {detail.scoringPlays.map((p: CfbPlay, idx: number) => (
                    <div key={p.id || idx} className="border-l border-emerald-500/60 pl-6 py-3">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-mono bg-black/60 px-3 py-1 rounded-full border border-white/10 text-indigo-400 font-black">
                          Q{p.period} {p.clock}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {detail.game.away.abr} {p.awayScore} — {detail.game.home.abr} {p.homeScore}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{p.text}</p>
                    </div>
                  ))}
                </>
              )}

              {stats.length > 0 && (
                <>
                  <div className="text-[11px] font-black text-white uppercase tracking-[0.4em] pt-6">Team Box</div>
                  {['totalYards', 'netPassingYards', 'rushingYards', 'firstDowns', 'turnovers', 'thirdDownEff'].map((k) => {
                    const a = statValue(detail.game.away.name, k);
                    const h = statValue(detail.game.home.name, k);
                    if (!a && !h) return null;
                    return (
                      <div key={k} className="grid grid-cols-3 items-center py-2 border-b border-white/5 text-xs font-mono">
                        <span className="text-right text-white font-black">{a ?? '-'}</span>
                        <span className="text-center text-[10px] uppercase tracking-widest text-slate-500">{k}</span>
                        <span className="text-left text-white font-black">{h ?? '-'}</span>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>

        <div className="p-6 bg-[#080a0f] border-t border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Zap size={12} className="text-emerald-500" />
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">ESPN archive · 2006 season</span>
          </div>
          <a
            href={`https://www.espn.com/college-football/game/_/gameId/${game.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs font-black text-white"
          >
            ESPN <ExternalLink size={12} className="text-indigo-400" />
          </a>
        </div>
      </div>
    </>
  );
};

function quarterRows(detail: CfbDetail) {
  const away = detail.game.away.linescores || [];
  const home = detail.game.home.linescores || [];
  const rows = [];
  for (let i = 0; i < Math.max(away.length, home.length); i++) {
    rows.push({ period: i + 1, away: away[i] ?? 0, home: home[i] ?? 0 });
  }
  rows.push({
    period: 0,
    away: away.reduce((a, b) => a + b, 0),
    home: home.reduce((a, b) => a + b, 0),
  });
  return rows;
}
