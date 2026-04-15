
import React from 'react';
import { LayoutDashboard, Target, MonitorPlay, ExternalLink, Mic, ShieldAlert, Trophy, Radio, BarChart3, Infinity, Calculator, Globe, Bot } from 'lucide-react';
import { clsx } from 'clsx';
import { League } from '../types';

interface NavBarProps {
  currentView: string;
  setCurrentView: (view: any) => void;
  onLaunchArby: () => void;
  activeLeague: League;
  setActiveLeague: (league: League) => void;
}

const QuantumLogo = () => (
  <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_15px_rgba(0,255,255,0.3)]">
    <defs>
      <linearGradient id="silver-sheen" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="20%" stopColor="#cbd5e1" />
        <stop offset="50%" stopColor="#475569" />
        <stop offset="80%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#ffffff" />
      </linearGradient>
      <linearGradient id="cyan-glow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#00ffff" />
      </linearGradient>
    </defs>
    <path d="M50 5L93.3 30V80L50 105L6.7 80V30L50 5Z" fill="url(#silver-sheen)" stroke="#1e293b" strokeWidth="2" transform="scale(0.9) translate(5, 0)" />
    <path d="M50 25L75 40V70L50 85L25 70V40L50 25Z" fill="#0f172a" />
    <path d="M50 35L55 50L70 55L55 60L50 75L45 60L30 55L45 50L50 35Z" fill="url(#cyan-glow)" className="animate-pulse" />
  </svg>
);

export const NavBar: React.FC<NavBarProps> = ({ currentView, setCurrentView, onLaunchArby, activeLeague, setActiveLeague }) => {
  
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
          <div className="flex items-center gap-4 cursor-pointer group shrink-0" onClick={() => setCurrentView('picks')}>
             <div className="relative group-hover:scale-105 transition-transform duration-500 ease-out">
                <QuantumLogo />
                <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full -z-10 group-hover:bg-cyan-500/30 transition-colors"></div>
             </div>
             
             <div className="flex flex-col justify-center">
                <div className="flex items-baseline gap-1">
                    <h1 className="text-xl xl:text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 drop-shadow-sm">
                        QUANTUM
                    </h1>
                    <span className="text-xl xl:text-2xl font-black tracking-tighter text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
                        BETS
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-[1px] w-6 bg-indigo-500/50"></div>
                    <span className="text-[9px] text-indigo-300 font-mono tracking-[0.2em] uppercase">
                        v2025.2
                    </span>
                </div>
             </div>
          </div>

          {/* League Selector */}
          <div className="hidden lg:flex items-center gap-1 mx-4 bg-slate-900/80 p-1 rounded-lg border border-slate-800 shadow-inner">
            {(['NFL', 'NBA', 'NHL', 'MLB', 'MLS', 'SOCCER', 'MMA', 'HORSE', 'GOLF', 'VELOCITY'] as League[]).map(league => {
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
              Binary Alpha Superposition
            </button>

            <button 
              id="nav-quantum"
              onClick={() => setCurrentView('quantum-edge')}
              className={getButtonClass(currentView === 'quantum-edge', 'text-indigo-400', 'shadow-[0_10px_20px_-10px_rgba(99,102,241,0.3)]')}
            >
              <Bot size={14} strokeWidth={3} />
              Quantum Edge
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
                  className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-950/40 to-red-900/20 border border-red-500/50 rounded hover:from-red-900/60 hover:to-red-800/40 transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  title="Launch Trading Terminal"
              >
                  <MonitorPlay size={16} className="text-red-500 group-hover:animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-red-400 tracking-wider hidden 2xl:block">
                      Terminal
                  </span>
                  <ExternalLink size={10} className="text-red-500/50" />
              </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
