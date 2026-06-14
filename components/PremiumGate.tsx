import React, { useState, useEffect } from 'react';
import { Target, Bot, MonitorPlay, ShieldCheck, CreditCard, Sparkles, Zap, ArrowRight, Loader2, CheckCircle, Lock, Gem, Star } from 'lucide-react';

interface PremiumGateProps {
    onUnlockPremium: () => void;
    currentViewName: string;
}

export const PremiumGate: React.FC<PremiumGateProps> = ({ onUnlockPremium, currentViewName }) => {
    const [step, setStep] = useState<'details' | 'processing' | 'success'>('details');
    const [progress, setProgress] = useState(0);
    const [simLogs, setSimLogs] = useState<string[]>([]);
    const [selectedTier, setSelectedTier] = useState<'monthly' | 'annual'>('monthly');

    const logs = [
        "Handshaking with ASYMBet Secure Ledger...",
        "Authorizing Arbitrage API credentials...",
        "Routing through Kalshi event pipeline...",
        "Linking real-time Polymarket order feeds...",
        "Spinning up custom reinforcement learning weights...",
        "Syncing low-latency MetLife Stadium scoreboards...",
        "Encrypting private subscriber secure key...",
        "Activating ASYMBet Premium Multi-Tier Pass!"
    ];

    useEffect(() => {
        if (step !== 'processing') return;

        let curLogIndex = 0;
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setStep('success');
                    }, 800);
                    return 100;
                }
                
                // Add logs periodically
                if (prev % 12 === 0 && curLogIndex < logs.length) {
                    setSimLogs(existing => [...existing, logs[curLogIndex]]);
                    curLogIndex++;
                }

                return prev + 2;
            });
        }, 50);

        return () => clearInterval(interval);
    }, [step]);

    const handleSubscribe = () => {
        setStep('processing');
        setSimLogs([ "Initializing checkout pipeline..." ]);
    };

    const handleSuccessClose = () => {
        onUnlockPremium();
    };

    const getTargetToolsText = () => {
        switch (currentViewName) {
            case 'binary-alpha': return "Binary Alpha Superposition";
            case 'quantum-edge': return "Quantum Edge";
            case 'trading-desk': return "Trading Desk Terminal";
            default: return "Premium Suite";
        }
    };

    if (step === 'processing') {
        return (
            <div className="max-w-4xl mx-auto px-6 py-12">
                <div className="bg-[#0b0f19] border border-cyan-500/30 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden shadow-[0_0_80px_rgba(6,182,212,0.15)]">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-cyan-500/10 to-transparent"></div>
                    </div>

                    <div className="relative z-10 space-y-8">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-2xl flex items-center justify-center animate-spin-slow">
                            <Zap className="text-white" size={32} />
                        </div>

                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter sm:text-4xl">
                                Activating Premium Suite
                            </h2>
                            <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mt-2">
                                Provisioning low-latency trading lines for {getTargetToolsText()}
                            </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="max-w-md mx-auto">
                            <div className="flex justify-between items-center text-xs font-mono text-cyan-400 mb-2">
                                <span>SECURE GATEWAY ENCRYPTION</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                                <div 
                                    className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full transition-all duration-75"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Micro Logs Terminal */}
                        <div className="max-w-lg mx-auto bg-black/85 border border-slate-900 rounded-xl p-5 font-mono text-[10px] text-left text-slate-400 h-44 overflow-y-auto space-y-1 custom-scrollbar">
                            <div className="text-[9px] text-[#00ffff] font-bold border-b border-slate-900 pb-1 mb-2 uppercase tracking-widest">
                                Transaction System Kernel Console
                            </div>
                            {simLogs.map((log, i) => (
                                <div key={i} className="flex gap-2 animate-in fade-in slide-in-from-left-1 duration-200">
                                    <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                                    <span className={i === simLogs.length - 1 ? "text-cyan-400 font-semibold" : ""}>
                                        {i === simLogs.length - 1 ? "⚡" : "✓"} {log}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'success') {
        return (
            <div className="max-w-2xl mx-auto px-6 py-12">
                <div className="bg-[#090e15] border border-emerald-500/30 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden shadow-[0_0_80px_rgba(16,185,129,0.15)] animate-in zoom-in-95 duration-500">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-emerald-500/10 to-transparent"></div>
                    </div>

                    <div className="relative z-10 space-y-8">
                        <div className="w-20 h-20 mx-auto bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)] animate-bounce">
                            <CheckCircle size={40} />
                        </div>

                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter sm:text-4xl">
                                Premium Unlocked
                            </h2>
                            <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mt-2">
                                Welcome to the ASYMBet Elite Layer
                            </p>
                        </div>

                        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-900 space-y-3 max-w-sm mx-auto text-left text-xs text-slate-300 font-mono">
                            <div className="flex justify-between">
                                <span className="text-slate-500">SUBSCRIBER LEVEL:</span>
                                <span className="text-amber-400 font-black">✦ ELITE EXECUTIVE</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">CONTRACT SUITE:</span>
                                <span className="text-white">ACTIVE (UNLIMITED)</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">ARBITRAGE ALERTS:</span>
                                <span className="text-cyan-400 font-bold">1ms DUAL-ROUTED</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">TERMINAL ACCESS:</span>
                                <span className="text-emerald-400">GRANTED</span>
                            </div>
                        </div>

                        <button
                            onClick={handleSuccessClose}
                            className="w-full max-w-xs py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 mx-auto"
                        >
                            Enter Premium Area
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-6 py-6 animate-in fade-in duration-500">
            {/* Top Gating Header */}
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em]">
                    <Lock size={12} className="text-indigo-400" />
                    Premium Handshake Gated Area
                </div>
                
                <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">
                    ASYM<span className="text-cyan-400">Bet</span> Premium Suite
                </h1>
                
                <p className="text-slate-400 text-sm leading-relaxed max-w-2xl mx-auto font-light">
                    You have requested access to <strong className="text-white font-black">{getTargetToolsText()}</strong>. 
                    This is a high-frequency, institutional-grade engine designed specifically for elite volume traders identifying betting dislocations.
                </p>
            </div>

            {/* Combined Bundle Visualizers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                {/* Product 1: Binary Alpha */}
                <div className="bg-[#070911] border border-slate-900 rounded-[32px] p-8 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                    <div className="absolute top-0 right-0 p-4 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors pointer-events-none">
                        <Target size={120} />
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
                        <Target size={24} />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Binary Alpha Feeds</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-light">
                        Cross-exchange, live-updated event contracts aggregated directly across Kalshi and Polymarket order pools. Identify and secure structural pricing mismatches pre-game and in-play instantly.
                    </p>
                </div>

                {/* Product 2: Quantum Edge */}
                <div className="bg-[#070911] border border-slate-900 rounded-[32px] p-8 relative overflow-hidden group hover:border-indigo-500/40 transition-all">
                    <div className="absolute top-0 right-0 p-4 text-indigo-500/5 group-hover:text-indigo-500/10 transition-colors pointer-events-none">
                        <Bot size={120} />
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6">
                        <Bot size={24} />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Quantum Edge Signals</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-light">
                        Multi-layered machine learning ingestion. Continuously calculates real-time probabilities using neural filters and triggers smart betting alerts when positive EV thresholds are verified.
                    </p>
                </div>

                {/* Product 3: Trading Desk */}
                <div className="bg-[#070911] border border-slate-900 rounded-[32px] p-8 relative overflow-hidden group hover:border-pink-500/40 transition-all">
                    <div className="absolute top-0 right-0 p-4 text-pink-500/5 group-hover:text-pink-500/10 transition-colors pointer-events-none">
                        <MonitorPlay size={120} />
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-6">
                        <MonitorPlay size={24} />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Advanced Desk Terminal</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-light">
                        Professional dual-exchange ticket slip module. Includes advanced Kelly Criterion portfolio managers, MetLife stadium feeds, and high-frequency risk exposure logs.
                    </p>
                </div>
            </div>

            {/* Pricing Action Plan Container */}
            <div className="max-w-3xl mx-auto">
                <div className="bg-gradient-to-r from-indigo-950/40 via-slate-950 to-indigo-950/40 border border-indigo-500/20 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-44 h-44 bg-cyan-400/5 blur-3xl rounded-full"></div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                        <div className="space-y-4 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-2">
                                <span className="bg-amber-400 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded">SAVE 33%</span>
                                <span className="text-slate-400 text-xs font-semibold">Virtual Sandbox Subscription</span>
                            </div>
                            
                            <h4 className="text-2xl font-black text-white uppercase tracking-tighter">ASYMBet Premium Access Pass</h4>
                            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                                Full, unrestricted VIP access. Includes immediate execution across day-trading feeds, interactive simulation engines, and portfolio tools.
                            </p>
                        </div>

                        <div className="bg-black/40 border border-slate-900 rounded-3xl p-6 text-center w-full md:w-64 space-y-6 shrink-0">
                            <div className="flex justify-center items-baseline gap-1">
                                <span className="text-4xl font-extrabold text-white font-mono">$0</span>
                                <span className="text-slate-500 font-mono text-sm">.00 / FREE</span>
                            </div>
                            <p className="text-[10px] text-indigo-400 font-mono uppercase tracking-widest font-black">
                                sandbox simulation pricing
                            </p>
                            
                            <button
                                type="button"
                                onClick={handleSubscribe}
                                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:scale-[1.02] transform transition-all text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2 group"
                            >
                                Activate Pass
                                <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform" />
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-slate-900 mt-8 pt-6 flex flex-wrap gap-4 justify-between text-[11px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-[#00ffff]" /> Unlimited access, zero transaction fees.
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Sparkles size={14} className="text-amber-400" /> Fully integrated with predictions pipeline.
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
