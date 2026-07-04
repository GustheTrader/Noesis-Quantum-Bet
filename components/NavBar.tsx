
import React from 'react';
import { LayoutDashboard, Target, MonitorPlay, ExternalLink, Mic, ShieldAlert, Trophy, Radio, BarChart3, Infinity, Calculator, Globe, Bot } from 'lucide-react';
import { clsx } from 'clsx';
import { League } from '../types';
import { GnoesisLogoIcon, GnoesisBrandText } from './GnoesisLogo';

interface NavBarProps {
  currentView: string;
  setCurrentView: (view: any) => void;
  onLaunchArby: () => void;
  activeLeague: League;
  setActiveLeague: (league: League) => void;
  isPremiumUnlocked?: boolean;
}

export const NavBar: React.FC<NavBarProps> = ({ currentView, setCurrentView, onLaunchArby, activeLeague, setActiveLeague, isPremiumUnlocked = false }) => {
  
  const getButtonClass = (isActive: boolean, colorClass: string, shadowClass: string) => {
      return clsx(
          "flex items-center gap-2 px-4 py-2.5 rounded-sm transition-all duration-300 font-black tracking-widest text-[10px] lg:text-xs uppercase border-b-2 relative overflow-hidden",
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#090a15] via-[#111322] to-[#090a15] backdrop-blur-xl border-b border-indigo-500/20 shadow-2xl">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
      
      <div className="max-w-[1800px] mx-auto px-6">
        <div className="flex items-center justify-between h-24">
          
          {/* Logo Section */}
          <div className="flex items-center gap-3.5 cursor-pointer group shrink-0" onClick={() => setCurrentView('picks')}>
             <div className="relative group-hover:scale-105 transition-transform duration-500 ease-out">
                <GnoesisLogoIcon size={52} />
                <div className="absolute inset-0 bg-cyan-500/10 blur-xl rounded-full -z-10 group-hover:bg-cyan-500/25 transition-colors"></div>
             </div>
             
             <div className="flex items-center gap-3">
                <GnoesisBrandText textSizeClass="text-lg xl:text-xl" subSizeClass="text-[8px] xl:text-[9px]" />
                <div className="hidden sm:flex items-center gap-2 border-l border-slate-800 pl-3">
                    <span className="text-[9px] text-cyan-400 font-mono tracking-[0.15em] uppercase bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">
                        v2026.1
                    </span>
                </div>
             </div>
          </div>

          {/* League Selector */}
          <div className="hidden lg:flex items-center gap-1 mx-4 bg-slate-900/80 p-1 rounded-lg border border-slate-800 shadow-inner">
            {(['NFL', 'NBA', 'NHL', 'MLB', 'CFL', 'MLS', 'SOCCER', 'MMA', 'HORSE', 'GOLF', 'VELOCITY'] as League[]).map(league => {
              const isVelocity = league === 'VELOCITY';
              return (
                <button
                  key={league}
                  onClick={() => setActiveLeague(league)}
                  className={clsx(
                    "px-2 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all duration-300",
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
          
          <div className="hidden xl:flex items-center gap-2 bg-black/20 p-1 rounded-t-lg border-b border-white/5">
            <button 
              id="nav-picks"
              onClick={() => setCurrentView('picks')}
              className={getButtonClass(currentView === 'picks', 'text-cyan-400', 'shadow-[0_10px_20px_-10px_rgba(6,182,212,0.3)]')}
            >
              <Target size={14} strokeWidth={3} />
              Daily Edge
            </button>

            <button 
              id="nav-odds"
              onClick={() => setCurrentView('odds')}
              className={getButtonClass(currentView === 'odds', 'text-orange-400', 'shadow-[0_10px_20px_-10px_rgba(251,146,60,0.3)]')}
            >
              <Trophy size={14} strokeWidth={3} />
              Odds Board
            </button>

            <button 
              id="nav-statsedge"
              onClick={() => setCurrentView('statsedge')}
              className={getButtonClass(currentView === 'statsedge', 'text-yellow-400', 'shadow-[0_10px_20px_-10px_rgba(250,204,21,0.3)]')}
            >
              <BarChart3 size={14} strokeWidth={3} />
              Stats Edge
            </button>

            <button 
              id="nav-binary"
              onClick={() => setCurrentView('binary-alpha')}
              className={getButtonClass(currentView === 'binary-alpha', 'text-emerald-400', 'shadow-[0_10px_20px_-10px_rgba(16,185,129,0.3)]')}
            >
              <Globe size={14} strokeWidth={3} />
              <span className="flex items-center gap-1.5">
                Binary Alpha
                {!isPremiumUnlocked && (
                  <span className="bg-amber-400/20 text-amber-300 text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded border border-amber-500/30 scale-90">
                    PREMIUM
                  </span>
                )}
              </span>
            </button>

            <button 
              id="nav-quantum"
              onClick={() => setCurrentView('quantum-edge')}
              className={getButtonClass(currentView === 'quantum-edge', 'text-indigo-400', 'shadow-[0_10px_20px_-10px_rgba(99,102,241,0.3)]')}
            >
              <Bot size={14} strokeWidth={3} />
              <span className="flex items-center gap-1.5">
                Quantum Edge
                {!isPremiumUnlocked && (
                  <span className="bg-amber-400/20 text-amber-300 text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded border border-amber-500/30 scale-90">
                    PREMIUM
                  </span>
                )}
              </span>
            </button>
          </div>
          
          <div className="ml-4 pl-4 border-l border-white/10 flex items-center gap-2 shrink-0">
            <button 
              id="nav-superposition"
              onClick={() => setCurrentView('superposition')}
              className={getButtonClass(currentView === 'superposition', 'text-pink-400', 'shadow-[0_10px_20px_-10px_rgba(236,72,153,0.3)]')}
            >
              <Infinity size={14} strokeWidth={3} />
              Model Analytics
            </button>

            <button 
              id="nav-dashboard"
              onClick={() => setCurrentView('dashboard')}
              className={getButtonClass(currentView === 'dashboard', 'text-slate-100', 'shadow-[0_10px_20px_-10px_rgba(255,255,255,0.1)]')}
            >
              <LayoutDashboard size={14} strokeWidth={3} />
              Player Analytics
            </button>

            <div className="w-px h-6 bg-white/10 mx-2"></div>

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
      </div>
    </nav>
  );
};
