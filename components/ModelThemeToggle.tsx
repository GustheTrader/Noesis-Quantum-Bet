import React, { useState, useEffect } from 'react';
import { ModelTheme, THEME_CONFIGS, getStoredTheme, applyModelTheme } from '../lib/theme';
import { clsx } from 'clsx';
import { Sparkles, Moon, Sun, Terminal, Check, Sliders, Eye, Zap, Layers } from 'lucide-react';

interface ModelThemeToggleProps {
  compact?: boolean;
  showPreview?: boolean;
  showVariables?: boolean;
  onThemeChanged?: (theme: ModelTheme) => void;
}

export const ModelThemeToggle: React.FC<ModelThemeToggleProps> = ({
  compact = false,
  showPreview = true,
  showVariables = true,
  onThemeChanged
}) => {
  const [currentTheme, setCurrentTheme] = useState<ModelTheme>(getStoredTheme);

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: ModelTheme }>;
      if (customEvent.detail?.theme) {
        setCurrentTheme(customEvent.detail.theme);
      }
    };
    window.addEventListener('model-theme-changed', handleThemeChange);
    return () => window.removeEventListener('model-theme-changed', handleThemeChange);
  }, []);

  const handleSelectTheme = (theme: ModelTheme) => {
    setCurrentTheme(theme);
    applyModelTheme(theme);
    if (onThemeChanged) {
      onThemeChanged(theme);
    }
  };

  const activeConfig = THEME_CONFIGS[currentTheme];

  if (compact) {
    return (
      <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner">
        {(['dark-matter', 'cyber-light', 'neon-matrix'] as ModelTheme[]).map((themeKey) => {
          const config = THEME_CONFIGS[themeKey];
          const isSelected = currentTheme === themeKey;
          return (
            <button
              key={themeKey}
              onClick={() => handleSelectTheme(themeKey)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 select-none",
                isSelected
                  ? themeKey === 'cyber-light'
                    ? "bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                    : themeKey === 'neon-matrix'
                    ? "bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                    : "bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
              title={config.name + " - " + config.tagline}
            >
              {themeKey === 'dark-matter' && <Moon size={12} />}
              {themeKey === 'cyber-light' && <Sun size={12} />}
              {themeKey === 'neon-matrix' && <Terminal size={12} />}
              <span>{config.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Visual Modes Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['dark-matter', 'cyber-light', 'neon-matrix'] as ModelTheme[]).map((themeKey) => {
          const config = THEME_CONFIGS[themeKey];
          const isSelected = currentTheme === themeKey;

          return (
            <div
              key={themeKey}
              onClick={() => handleSelectTheme(themeKey)}
              className={clsx(
                "cursor-pointer rounded-2xl p-5 border transition-all duration-300 relative overflow-hidden group flex flex-col justify-between select-none",
                isSelected
                  ? "border-current shadow-2xl scale-[1.02]"
                  : "border-slate-800 bg-black/40 hover:border-slate-700 hover:bg-slate-900/30"
              )}
              style={{
                borderColor: isSelected ? config.accentColor : undefined,
                boxShadow: isSelected ? `0 0 25px ${config.accentColor}33` : undefined,
                background: isSelected ? config.previewBg : undefined
              }}
            >
              {/* Top Row: Icon + Badge + Check */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110"
                    style={{
                      background: `${config.accentColor}18`,
                      borderColor: `${config.accentColor}44`,
                      color: config.accentColor
                    }}
                  >
                    {themeKey === 'dark-matter' && <Moon size={18} />}
                    {themeKey === 'cyber-light' && <Sun size={18} />}
                    {themeKey === 'neon-matrix' && <Terminal size={18} />}
                  </div>

                  <div className="flex items-center gap-2">
                    <span 
                      className="text-[9px] font-mono font-black tracking-widest px-2 py-0.5 rounded border uppercase"
                      style={{
                        background: `${config.accentColor}15`,
                        borderColor: `${config.accentColor}33`,
                        color: config.accentColor
                      }}
                    >
                      {config.badge}
                    </span>
                    {isSelected && (
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center text-black"
                        style={{ background: config.accentColor }}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Name and Tagline */}
                <h4 className="text-base font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                  {config.name}
                </h4>
                <p 
                  className="text-[11px] font-mono font-bold uppercase tracking-wider mb-3"
                  style={{ color: config.accentColor }}
                >
                  {config.tagline}
                </p>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed">
                  {config.description}
                </p>
              </div>

              {/* Bottom CSS swatch pill */}
              <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-500 uppercase tracking-wider">Refraction Mode</span>
                <span className="text-white font-bold flex items-center gap-1.5">
                  <span 
                    className="w-2 h-2 rounded-full animate-pulse" 
                    style={{ background: config.accentColor }}
                  />
                  {themeKey === 'cyber-light' ? 'Holographic' : themeKey === 'neon-matrix' ? 'Phosphor' : 'Obsidian'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Glass-Panel Interactive Demonstration */}
      {showPreview && (
        <div className="rounded-2xl p-6 border border-slate-800/80 bg-black/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="text-cyan-400" size={16} />
              <h5 className="text-xs font-black text-white uppercase tracking-widest">
                Real-Time Glass-Panel Substrate Preview
              </h5>
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Sparkles size={11} className="text-indigo-400" />
              Dynamic Substrate Bound: <strong className="text-white">{activeConfig.name}</strong>
            </span>
          </div>

          {/* This is an ACTUAL .glass-panel element! */}
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden transition-all duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner"
                  style={{
                    background: `${activeConfig.accentColor}22`,
                    borderColor: `${activeConfig.accentColor}66`,
                    color: activeConfig.accentColor
                  }}
                >
                  <Zap size={22} />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: activeConfig.accentColor }}>
                    Active Substrate Container
                  </div>
                  <h6 className="text-base font-black text-white uppercase tracking-tight">
                    .glass-panel Telemetry Node
                  </h6>
                  <p className="text-xs text-slate-300/80">
                    Backdrop blur, refractive border, and photon glow update synchronously across all views.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/10 font-mono text-xs">
                <div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider">Substrate Alpha</div>
                  <div className="font-bold text-white">
                    {currentTheme === 'cyber-light' ? '18% Luminous' : currentTheme === 'neon-matrix' ? '70% Matrix' : '72% Obsidian'}
                  </div>
                </div>
                <div className="w-px h-6 bg-white/10"></div>
                <div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider">Filter Blur</div>
                  <div className="font-bold" style={{ color: activeConfig.accentColor }}>
                    {activeConfig.variables['--glass-blur']}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live CSS Variables Inspector */}
      {showVariables && (
        <div className="rounded-2xl p-5 border border-slate-800/80 bg-black/60 font-mono text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-slate-400">
              <Sliders size={14} className="text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                Active CSS Custom Properties (:root)
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-wider text-slate-500">
              Synchronized to window
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
            {Object.entries(activeConfig.variables).map(([prop, val]) => (
              <div 
                key={prop} 
                className="flex items-center justify-between bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/50"
              >
                <span className="text-indigo-400 font-bold">{prop}:</span>
                <span className="text-slate-300 truncate max-w-[200px]" title={val}>
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
