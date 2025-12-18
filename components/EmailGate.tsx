
import React, { useState } from 'react';
import { ArrowRight, Loader2, ShieldCheck, Zap, CheckCircle, Map, Mic, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clsx } from 'clsx';

interface EmailGateProps {
    onUnlock: (mode: 'tour' | 'voice' | 'direct') => void;
}

export const EmailGate: React.FC<EmailGateProps> = ({ onUnlock }) => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'selection'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const formatError = (err: any): string => {
        if (!err) return "Unknown Error";
        if (typeof err === 'string') return err;
        if (err instanceof Error) return err.message;
        if (typeof err === 'object') {
            return err.message || err.error_description || JSON.stringify(err);
        }
        return String(err);
    };

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
            const { error } = await supabase.from('visitor_emails').insert({ email });
            
            if (error) {
                const msg = formatError(error);
                if (msg.includes('Could not find the table') || error.code === '42P01') {
                    console.warn("SETUP REQUIRED: Table 'visitor_emails' does not exist.");
                } else if (error.code === '23505' || msg.includes('duplicate key') || msg.includes('unique constraint')) {
                     // User already exists, proceed gracefully
                } else {
                    console.error("Supabase Capture Error:", msg);
                }
            }

            setStatus('selection');

        } catch (err) {
            const msg = formatError(err);
             if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
                 setStatus('selection');
                 return;
             }
            console.error("Capture failed:", msg);
            // Even on error, allow proceeding to selection
            setStatus('selection');
        }
    };

    if (status === 'selection') {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black selection:bg-cyan-500/30">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/20 to-transparent opacity-50"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/5 blur-[120px] rounded-full animate-pulse-slow"></div>
                </div>

                <div className="relative w-full max-w-4xl px-6 animate-in fade-in zoom-in duration-500">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
                            <CheckCircle size={14} /> Access Granted
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4">
                            Select Entry Protocol
                        </h1>
                        <p className="text-slate-400 text-sm">Choose your interface mode for this session.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Option 1: Tour */}
                        <button 
                            onClick={() => onUnlock('tour')}
                            className="glass-panel p-8 rounded-2xl border border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-900/10 transition-all group text-left relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Map size={80} />
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                                <Map size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">System Tour</h3>
                            <p className="text-sm text-slate-400 leading-relaxed mb-6">
                                Full guided walkthrough of the dashboard, arbitrage scanner, and risk tools. Recommended for new users.
                            </p>
                            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                                Start Tour <ArrowRight size={14} />
                            </div>
                        </button>

                        {/* Option 2: Coach */}
                        <button 
                            onClick={() => onUnlock('voice')}
                            className="glass-panel p-8 rounded-2xl border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-900/10 transition-all group text-left relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Mic size={80} />
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                                <Mic size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Talk to Coach</h3>
                            <p className="text-sm text-slate-400 leading-relaxed mb-6">
                                Bypass the UI and speak directly to the ARBY-BOT Voice Agent for rapid analysis and strategy.
                            </p>
                            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                                Connect Audio <ArrowRight size={14} />
                            </div>
                        </button>

                        {/* Option 3: Direct */}
                        <button 
                            onClick={() => onUnlock('direct')}
                            className="glass-panel p-8 rounded-2xl border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-900/10 transition-all group text-left relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Zap size={80} />
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                                <Target size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Live Edge Bets</h3>
                            <p className="text-sm text-slate-400 leading-relaxed mb-6">
                                Immediate access to the Daily Picks feed. No tours, no popups. Pure alpha for returning traders.
                            </p>
                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                Enter Feed <ArrowRight size={14} />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black selection:bg-cyan-500/30">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/20 to-transparent opacity-50"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/5 blur-[120px] rounded-full animate-pulse-slow"></div>
            </div>

            <div className="relative w-full max-w-md px-6 animate-in fade-in zoom-in duration-700">
                <div className="glass-panel p-1 rounded-3xl border border-cyan-500/30 shadow-[0_0_80px_rgba(6,182,212,0.15)]">
                    <div className="bg-[#0a0e17]/95 rounded-[22px] p-8 md:p-10 text-center relative overflow-hidden">
                        
                        <div className="w-16 h-16 mx-auto mb-8 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                            <Zap className="text-cyan-400" size={32} />
                        </div>

                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-3">
                            Quantum<span className="text-cyan-400">Bets</span>
                        </h1>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8">
                            Initialize the high-frequency trading terminal. Enter your authorized email to establish a secure connection.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative group">
                                <input
                                    type="email"
                                    placeholder="Enter your email..."
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={status === 'loading'}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-4 pl-5 pr-12 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-slate-900 focus:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all font-mono disabled:opacity-50"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none group-focus-within:text-cyan-500 transition-colors">
                                    <ShieldCheck size={18} />
                                </div>
                            </div>

                            {status === 'error' && (
                                <p className="text-rose-400 text-xs font-bold animate-pulse">{errorMessage}</p>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg transition-all flex items-center justify-center gap-2 group bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-cyan-500/20 disabled:opacity-80 disabled:cursor-not-allowed"
                            >
                                {status === 'loading' ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    <>
                                        Access Terminal
                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-slate-800/50">
                            <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono">
                                Secure Session ID: {Date.now().toString(36).toUpperCase()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
