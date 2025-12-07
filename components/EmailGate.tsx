
import React, { useState } from 'react';
import { ArrowRight, Loader2, ShieldCheck, Zap, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clsx } from 'clsx';

interface EmailGateProps {
    onUnlock: () => void;
}

export const EmailGate: React.FC<EmailGateProps> = ({ onUnlock }) => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
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
                
                // Specific handling for missing table
                if (msg.includes('Could not find the table') || error.code === '42P01') {
                    console.warn("SETUP REQUIRED: Table 'visitor_emails' does not exist in Supabase. Please run the SQL in lib/supabase.ts");
                } else {
                    console.error("Supabase Capture Error:", msg);
                }
            }

            // Always allow access even if logging fails (fail open)
            setStatus('success');
            
            setTimeout(() => {
                onUnlock();
            }, 1000);

        } catch (err) {
            const msg = formatError(err);
            console.error("Capture failed:", msg);
            // Fallback: unlock anyway so user isn't stuck
            onUnlock();
        }
    };

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
                        
                        {/* Logo / Icon */}
                        <div className="w-16 h-16 mx-auto mb-8 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                            {status === 'success' ? (
                                <CheckCircle className="text-emerald-400 animate-in zoom-in" size={32} />
                            ) : (
                                <Zap className="text-cyan-400" size={32} />
                            )}
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
                                    disabled={status === 'loading' || status === 'success'}
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
                                disabled={status === 'loading' || status === 'success'}
                                className={clsx(
                                    "w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-80 disabled:cursor-not-allowed",
                                    status === 'success' 
                                        ? "bg-emerald-500 text-black shadow-emerald-500/20" 
                                        : "bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-cyan-500/20"
                                )}
                            >
                                {status === 'loading' ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Authenticating...
                                    </>
                                ) : status === 'success' ? (
                                    <>
                                        <CheckCircle size={16} />
                                        Access Granted
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
