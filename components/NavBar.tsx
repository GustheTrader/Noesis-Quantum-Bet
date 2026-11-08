
import React from 'react';
import { LayoutDashboard, Target, MonitorPlay, ExternalLink, Mic, ShieldAlert, Trophy, Radio, BarChart3, Infinity, Calculator, Bot, Settings, Palette } from 'lucide-react';
import { clsx } from 'clsx';
import { League } from '../types';
const quantumBetsLogoImg = '/img/quantum-bets-logo-96.webp';
const gnoesisLabsLogoImg = '/img/gnoesis-labs-72.webp';

interface NavBarProps {
  currentView: string;
  setCurrentView: (view: any) => void;
  onLaunchArby: () => void;
  activeLeague: League;
  setActiveLeague: (league: League) => void;
  isPremiumUnlocked?: boolean;
  onOpenSettings?: () => void;
  onLeagueClick?: (league: League) => void;
}

export const NavBar: React.FC<NavBarProps> = ({ currentView, setCurrentView, onLaunchArby, activeLeague, setActiveLeague, isPremiumUnlocked = false, onOpenSettings, onLeagueClick }) => {
  const selectLeague = (league: League) => { setActiveLeague(league); onLeagueClick?.(league); };
  
  const getButtonClass = (isActive: boolean, colorClass: string, shadowClass: string) => {
      return clsx(
          "flex items-center gap-2 px-4 py-3 rounded-sm transition-all duration-300 font-black tracking-widest text-[18px] lg:text-[19px] uppercase border-b-2 relative overflow-hidden",
          isActive 
            ? `${colorClass} ${shadowClass} border-current bg-white/5` 
            : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
      );
  };

  const launchTradingDesk = () => {
      setCurrentView('trading-desk');
      try {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        }
      } catch (e) {
          console.warn("Fullscreen denied", e);
      }
  };

  return (
    <nav className="quantum-nav fixed top-0 left-0 right-0 z-50 backdrop-blur-xl shadow-2xl">
      <style>{`
        .quantum-nav { background: linear-gradient(115deg, #080b1b 0%, #151034 48%, #061c27 100%); border-bottom: 1px solid #55f5d055; isolation: isolate; }
        .quantum-nav::before { content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none; background: radial-gradient(ellipse at 22% 0%, #f53eff26, transparent 38%), radial-gradient(ellipse at 80% 10%, #00ffc833, transparent 42%); animation: quantum-glow 9s ease-in-out infinite alternate; }
        .quantum-nav button { transition: transform .2s ease, color .2s ease, background .2s ease, box-shadow .2s ease, border-color .2s ease; }
        .quantum-nav button:hover { transform: translateY(-2px); }
        .quantum-nav button:focus-visible { outline: 2px solid #aaffeb; outline-offset: 3px; }
        .quantum-nav [data-testid="nav-actions"] > div { background: rgba(10, 13, 33, .72); border: 1px solid #a46cff44; border-radius: 14px; box-shadow: 0 8px 32px #0005, inset 0 1px #ffffff12; }
        .quantum-nav [data-testid="nav-actions"] > div:first-child button { font-size: clamp(9px, .67vw, 14px); letter-spacing: 0; padding: 9px clamp(3px, .3vw, 7px); }
        .quantum-nav [data-testid="nav-actions"] > div:first-child button.bg-cyan-500, .quantum-nav [data-testid="league-strip"] button.bg-cyan-500 { background: linear-gradient(120deg, #adffdc, #28dbea); color: #071821; box-shadow: 0 0 24px #24f3ce66; }
        .quantum-nav [data-testid="nav-actions"] > div:nth-child(2) button { font-size: clamp(9px, .67vw, 14px); letter-spacing: 0; border-radius: 10px; padding: 9px clamp(3px, .3vw, 7px); white-space: nowrap; }
        @keyframes quantum-glow { from { opacity: .55; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .quantum-nav::before { animation: none; } .quantum-nav button { transition: none; } .quantum-nav button:hover { transform: none; } .quantum-nav .animate-pulse, .quantum-nav .animate-pulse-slow { animation: none; } }
      `}</style>
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
      
      <div className="w-full px-2">
        <div className="flex items-center justify-between h-24">
          
          {/* Logo Section */}
          <div className="flex flex-col justify-center gap-1.5 cursor-pointer group shrink-0" onClick={() => setCurrentView('picks')}>
             <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white tracking-tighter uppercase leading-none whitespace-nowrap">
                    Quantum<span className="text-cyan-400">Bets</span>
                </span>
                <span className="hidden sm:inline-block text-[9px] text-cyan-400 font-mono tracking-[0.15em] uppercase bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">
                    v2026.1
                </span>
             </div>
             <div className="flex items-center gap-3">
                <div className="relative group-hover:scale-105 transition-transform duration-500 ease-out shrink-0">
                    <img
                      src={quantumBetsLogoImg}
                      alt="Quantum Bets Logo"
                      className="w-12 h-12 rounded-xl border border-cyan-500/30 object-cover shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-slate-950"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-cyan-500/10 blur-xl rounded-full -z-10 group-hover:bg-cyan-500/25 transition-colors"></div>
                </div>
                <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
                    <span className="text-[8px] font-mono text-slate-500 tracking-wider uppercase font-black">
                        Powered by
                    </span>
                    <img
                      src={gnoesisLabsLogoImg}
                      alt="Gnoesis Labs"
                      className="h-9 object-contain rounded-sm border border-slate-800/50"
                      referrerPolicy="no-referrer"
                    />
                </div>
             </div>
          </div>

          <div className="hidden lg:flex min-w-0 flex-1 overflow-x-auto mx-2" data-testid="nav-actions">
          {/* League Selector */}
          <div className="hidden lg:flex shrink-0 items-center justify-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 shadow-inner ml-auto">
            {(['NFL', 'CFB', 'NBA', 'NHL', 'MLB', 'CFL', 'MLS', 'SOCCER', 'MMA', 'HORSE', 'GOLF', 'VELOCITY'] as League[]).map(league => {
              const isVelocity = league === 'VELOCITY';
              return (
                <button
                  key={league}
                  onClick={() => selectLeague(league)}
                  className={clsx(
                    "px-3.5 py-2.5 rounded-md text-[18px] font-black uppercase tracking-widest transition-all duration-300",
                    activeLeague === league 
                      ? isVelocity 
                        ? "bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(192,38,211,0.6)] scale-110 animate-pulse"
                        : "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-105" 
                      : isVelocity
                        ? "text-fuchsia-400 border border-fuchsia-500/20 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10"
                        : "text-slate-500 hover:text-white hover:bg-white/5"
                  )}
                >
                  {league}
                </button>
              );
            })}
          </div>
          
          <div className="flex shrink-0 items-center justify-center gap-1 bg-black/20 p-1 rounded-t-lg border-b border-white/5 mr-auto">
            <button 
              id="nav-picks"
              onClick={() => setCurrentView('picks')}
              className={getButtonClass(currentView === 'picks', 'text-cyan-400', 'shadow-[0_10px_20px_-10px_rgba(6,182,212,0.3)]')}
            >
              <Target size={18} strokeWidth={3} />
              Top Edge
            </button>

            <button 
              id="nav-odds"
              onClick={() => setCurrentView('odds')}
              className={getButtonClass(currentView === 'odds', 'text-orange-400', 'shadow-[0_10px_20px_-10px_rgba(251,146,60,0.3)]')}
            >
              <Trophy size={18} strokeWidth={3} />
              Odds Board
            </button>

            <button 
              id="nav-statsedge"
              onClick={() => setCurrentView('statsedge')}
              className={getButtonClass(currentView === 'statsedge', 'text-yellow-400', 'shadow-[0_10px_20px_-10px_rgba(250,204,21,0.3)]')}
            >
              <BarChart3 size={18} strokeWidth={3} />
              Stats Edge
            </button>

            <button 
              id="nav-quantum"
              onClick={() => setCurrentView('quantum-edge')}
              className={getButtonClass(currentView === 'quantum-edge', 'text-indigo-400', 'shadow-[0_10px_20px_-10px_rgba(99,102,241,0.3)]')}
            >
              <Bot size={18} strokeWidth={3} />
              <span className="flex items-center gap-1.5">
                Quantum Edge
                {!isPremiumUnlocked && (
                  <span className="bg-amber-400/20 text-amber-300 text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded border border-amber-500/30 scale-90">
                    PREMIUM
                  </span>
                )}
              </span>
            </button>
            <button 
              id="nav-superposition"
              onClick={() => setCurrentView('superposition')}
              className={getButtonClass(currentView === 'superposition', 'text-pink-400', 'shadow-[0_10px_20px_-10px_rgba(236,72,153,0.3)]')}
            >
              <Infinity size={18} strokeWidth={3} />
              Model Analytics
            </button>

            <button 
              id="nav-dashboard"
              onClick={() => setCurrentView('dashboard')}
              className={getButtonClass(currentView === 'dashboard', 'text-slate-100', 'shadow-[0_10px_20px_-10px_rgba(255,255,255,0.1)]')}
            >
              <LayoutDashboard size={18} strokeWidth={3} />
              Player Analytics
            </button>
          </div>
          
          </div>


          <div className="ml-2 flex items-center gap-2 shrink-0">
              {onOpenSettings && (
                <button
                  id="nav-settings"
                  onClick={onOpenSettings}
                  className="w-9 h-9 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-400/50 flex items-center justify-center transition-all hover:bg-cyan-500/10"
                  title="Model Theme & Settings"
                >
                  <Settings size={16} />
                </button>
              )}

              <button
                id="nav-admin"
                onClick={() => setCurrentView('admin')}
                className={clsx(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-all border",
                    currentView === 'admin' 
                      ? "bg-rose-500/20 border-rose-500 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]" 
                      : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-400/50"
                )}
                title="Admin Control"
              >
                  <ShieldAlert size={16} />
              </button>

              <button
                id="nav-arby"
                onClick={onLaunchArby}
                className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/50 flex items-center justify-center text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] animate-pulse-slow"
                title="Talk to COACH"
              >
                  <Mic size={16} />
              </button>

              <button 
                  id="nav-terminal"
                  onClick={launchTradingDesk}
                  className={clsx(
                    "group flex items-center gap-2 px-4 py-2 rounded hover:from-red-900/60 hover:to-red-800/40 transition-all",
                    !isPremiumUnlocked 
                      ? "bg-gradient-to-r from-amber-950/40 to-amber-900/20 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      : "bg-gradient-to-r from-red-950/40 to-red-900/20 border border-red-500/50 rounded hover:from-red-900/60 hover:to-red-800/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  )}
                  title="Launch Trading Terminal"
              >
                  <MonitorPlay size={16} className={clsx(!isPremiumUnlocked ? "text-amber-500" : "text-red-500 group-hover:animate-pulse")} />
                  <span className={clsx("text-[10px] font-black uppercase tracking-wider hidden 2xl:block", !isPremiumUnlocked ? "text-amber-400" : "text-red-400")}>
                      Terminal {!isPremiumUnlocked && "★"}
                  </span>
                  <ExternalLink size={10} className={!isPremiumUnlocked ? "text-amber-500/50" : "text-red-500/50"} />
              </button>
          </div>
        </div>

        <div className="lg:hidden flex items-center gap-1 overflow-x-auto pb-2 -mt-1 scrollbar-none" data-testid="league-strip">
          {(['NFL', 'CFB', 'NBA', 'NHL', 'MLB', 'CFL', 'MLS', 'SOCCER', 'MMA', 'HORSE', 'GOLF', 'VELOCITY'] as League[]).map(league => (
            <button
              key={league}
              onClick={() => selectLeague(league)}
              className={clsx(
                "shrink-0 px-3.5 py-2 rounded-md text-xs font-black uppercase tracking-widest",
                activeLeague === league ? "bg-cyan-500 text-black" : "text-slate-400 bg-slate-900/80 border border-slate-800"
              )}
            >
              {league}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};
