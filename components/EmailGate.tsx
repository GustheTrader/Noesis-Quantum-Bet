
import React, { useState, useEffect } from 'react';
import { ArrowRight, Loader2, ShieldCheck, Zap, CheckCircle, Map, Mic, Target, Cpu, Lock, Terminal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clsx } from 'clsx';

interface EmailGateProps {
    onUnlock: (mode: 'tour' | 'voice' | 'direct') => void;
}

export const EmailGate: React.FC<EmailGateProps> = ({ onUnlock }) => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'selection'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [isReturningUser, setIsReturningUser] = useState(false);

    useEffect(() => {
        const tourSeen = localStorage.getItem('quantum_tour_seen') === 'true';
        setIsReturningUser(tourSeen);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !email.includes('@')) {
            setStatus('error');
            setErrorMessage('Please enter a valid email address.');
            return;
        }

        setStatus('loading');
        setErrorMessage('');

        try {
            // Log to Supabase
            await supabase.from('visitor_emails').insert({ email });
            
            // If it's a first time user, skip selection and go straight to tour
            if (!isReturningUser) {
                onUnlock('tour');
            } else {
                setStatus('selection');
            }
        } catch (err: any) {
            console.warn("Marketing Gate - Database Connection Unavailable");
            if (!isReturningUser) onUnlock('tour');
            else setStatus('selection');
        }
    };

    if (status === 'selection') {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black selection:bg-cyan-500/30">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/20 to-transparent opacity-50"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/5 blur-[120px] rounded-full animate-pulse-slow"></div>
                </div>

                <div className="relative w-full max-w-5xl px-6 animate-in fade-in zoom-in duration-500">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
                            <CheckCircle size={14} /> Neural Interface Established
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-4 leading-none">
                            Quantum<span className="text-cyan-400">Bets</span>
                        </h1>
                        <p className="text-slate-500 text-sm font-mono uppercase tracking-widest">Select Operational Mode // ID: {email.split('@')[0].toUpperCase()}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Option 1: Edge (Direct) */}
                        <button 
                            onClick={() => onUnlock('direct')}
                            className="glass-panel p-10 rounded-[32px] border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-900/10 transition-all group text-left relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Target size={100} />
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-8 group-hover:scale-110 transition-transform border border-emerald-500/20 shadow-lg">
                                <Zap size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Live Alpha Feed</h3>
                            <p className="text-sm text-slate-400 leading-relaxed mb-8">
                                Immediate access to the 2025 High-Frequency daily position board. Recommended for established traders.
                            </p>
                            <div className="flex items-center gap-3 text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 w-fit px-4 py-2 rounded-full">
                                Initialize Edge <ArrowRight size={14} />
                            </div>
                        </button>

                        {/* Option 2: Coach (Voice) */}
                        <button 
                            onClick={() => onUnlock('voice')}
                            className="glass-panel p-10 rounded-[32px] border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-900/10 transition-all group text-left relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Mic size={100} />
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-8 group-hover:scale-110 transition-transform border border-indigo-500/20 shadow-lg">
                                <Mic size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">Voice Comms</h3>
                            <p className="text-sm text-slate-400 leading-relaxed mb-8">
                                Direct encrypted voice link with ARBY-BOT. Strategy breakdowns and math-driven market sentiment.
                            </p>
                            <div className="flex items-center gap-3 text-indigo-400 text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 w-fit px-4 py-2 rounded-full">
                                Establish Link <ArrowRight size={14} />
                            </div>
                        </button>

                        {/* Option 3: Tour (System) */}
                        <button 
                            onClick={() => onUnlock('tour')}
                            className="glass-panel p-10 rounded-[32px] border border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-900/10 transition-all group text-left relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Map size={100} />
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-8 group-hover:scale-110 transition-transform border border-cyan-500/20 shadow-lg">
                                <Terminal size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter">System Re-Tour</h3>
                            <p className="text-sm text-slate-400 leading-relaxed mb-8">
                                Re-initialize the onboarding protocol. Review risk tools, arbitrage scanner, and ledger mechanics.
                            </p>
                            <div className="flex items-center gap-3 text-cyan-400 text-[10px] font-black uppercase tracking-widest bg-cyan-500/10 w-fit px-4 py-2 rounded-full">
                                Run Protocol <ArrowRight size={14} />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black selection:bg-cyan-500/30">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/20 to-transparent opacity-50"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-cyan-500/[0.03] blur-[150px] rounded-full animate-pulse-slow"></div>
            </div>

            <div className="relative w-full max-w-md px-6 animate-in fade-in zoom-in duration-1000">
                <div className="glass-panel p-1 rounded-[48px] border border-cyan-500/30 shadow-[0_0_100px_rgba(6,182,212,0.1)]">
                    <div className="bg-[#0a0e17]/95 rounded-[46px] p-10 md:p-12 text-center relative overflow-hidden">
                        
                        <div className="w-24 h-24 mx-auto mb-10 bg-cyan-500/10 rounded-3xl flex items-center justify-center border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.1)] group">
                            <Cpu className="text-cyan-400 group-hover:scale-110 transition-transform" size={48} />
                        </div>

                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4 leading-none">
                            Quantum<span className="text-cyan-400">Bets</span>
                        </h1>
                        <p className="text-slate-400 text-sm leading-relaxed mb-10 font-medium">
                            Authorized personnel only. Initialize session via encrypted email handshake.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="relative group">
                                <input
                                    type="email"
                                    placeholder="TRADER_ID@EMAIL.COM"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={status === 'loading'}
                                    className="w-full bg-black/60 border border-slate-700 rounded-2xl py-5 pl-6 pr-12 text-white placeholder:text-slate-700 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_25px_rgba(6,182,212,0.1)] transition-all font-mono text-sm disabled:opacity-50"
                                />
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none group-focus-within:text-cyan-500 transition-colors">
                                    <Lock size={20} />
                                </div>
                            </div>

                            {status === 'error' && (
                                <p className="text-rose-500 text-xs font-black uppercase tracking-widest animate-pulse">{errorMessage}</p>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl transition-all flex items-center justify-center gap-3 group bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-cyan-500/30 disabled:opacity-80 disabled:cursor-not-allowed"
                            >
                                {status === 'loading' ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        SYNCING...
                                    </>
                                ) : (
                                    <>
                                        Access Terminal
                                        <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-12 flex items-center justify-center gap-3 opacity-30">
                            <div className="h-px w-8 bg-slate-500"></div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] font-black">
                                SECURE LINK v2.5
                            </p>
                            <div className="h-px w-8 bg-slate-500"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
