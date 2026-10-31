import React, { useState, useEffect } from 'react';
import { ModelThemeToggle } from './ModelThemeToggle';
import { getStoredTheme, ModelTheme, THEME_CONFIGS } from '../lib/theme';
import { 
  X, Settings, Sliders, Palette, Bell, Cpu, ShieldCheck, 
  RotateCcw, Sparkles, CheckCircle2 
} from 'lucide-react';
import { clsx } from 'clsx';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'THEME' | 'TELEMETRY' | 'ENGINE'>('THEME');
  const [currentTheme, setCurrentTheme] = useState<ModelTheme>(getStoredTheme);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: ModelTheme }>;
      if (customEvent.detail?.theme) {
        setCurrentTheme(customEvent.detail.theme);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
      }
    };
    window.addEventListener('model-theme-changed', handleThemeChange);
    return () => window.removeEventListener('model-theme-changed', handleThemeChange);
  }, []);

  if (!isOpen) return null;

  const activeConfig = THEME_CONFIGS[currentTheme];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl bg-[#070a12] border border-slate-800 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] relative"
        style={{
          boxShadow: `0 0 50px ${activeConfig.accentColor}22`
        }}
      >
        {/* Top Header */}
        <div className="p-6 sm:p-8 border-b border-slate-800/80 bg-gradient-to-r from-slate-950 via-[#0a0f1d] to-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner"
              style={{
                background: `${activeConfig.accentColor}18`,
                borderColor: `${activeConfig.accentColor}44`,
                color: activeConfig.accentColor
              }}
            >
              <Settings size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                  Platform Settings
                </h3>
                <span 
                  className="text-[9px] font-mono font-bold tracking-widest px-2 py-0.5 rounded border uppercase"
                  style={{
                    background: `${activeConfig.accentColor}15`,
                    borderColor: `${activeConfig.accentColor}44`,
                    color: activeConfig.accentColor
                  }}
                >
                  {activeConfig.name} Mode
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Reconfigure visual substrates, CSS variables, and telemetry parameters
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 flex items-center justify-center transition-colors"
              title="Close Settings"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 sm:px-8 pt-4 pb-2 border-b border-slate-800/60 bg-[#05070d]">
          <button
            onClick={() => setActiveTab('THEME')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
              activeTab === 'THEME'
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Palette size={14} />
            Model Theme & Glass Panels
          </button>

          <button
            onClick={() => setActiveTab('TELEMETRY')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
              activeTab === 'TELEMETRY'
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Bell size={14} />
            Telemetry & Alerts
          </button>

          <button
            onClick={() => setActiveTab('ENGINE')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
              activeTab === 'ENGINE'
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Cpu size={14} />
            Engine Core
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
          {activeTab === 'THEME' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={16} className="text-cyan-400" />
                    Model Theme Visual Engine
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Select a visual mode to dynamically manipulate CSS variables for all <code className="text-cyan-400 bg-slate-900 px-1.5 py-0.5 rounded text-[11px]">.glass-panel</code> components.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Current:</span>
                  <span className="text-xs font-black uppercase tracking-wider" style={{ color: activeConfig.accentColor }}>
                    {activeConfig.name}
                  </span>
                </div>
              </div>

              {/* Theme Toggle Component */}
              <ModelThemeToggle showPreview={true} showVariables={true} />
            </div>
          )}

          {activeTab === 'TELEMETRY' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="p-6 rounded-2xl bg-black/40 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">
                      Model ROI Anomaly Monitor
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Continuously track Z-score deviation against historical performance on the Dashboard.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-mono font-bold uppercase">
                    Active & Monitoring
                  </span>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-black/40 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">
                      Glass Panel Animation Smoothing
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Hardware-accelerated CSS variable transitions during theme switching.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg text-[10px] font-mono font-bold uppercase">
                    350ms Cubic-Bezier Enabled
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ENGINE' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="p-6 rounded-2xl bg-black/40 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="text-emerald-400" size={24} />
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">
                        QuantumEdge Kernel
                      </h4>
                      <p className="text-xs text-slate-400 font-mono">
                        v2026.1-production-build // Gnoesis Labs
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
                  >
                    <RotateCcw size={12} />
                    Reload State
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-8 border-t border-slate-800/80 bg-slate-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {showToast && (
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] animate-in fade-in">
                <CheckCircle2 size={14} /> Theme dynamically applied to all glass-panel components.
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white hover:bg-slate-200 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
