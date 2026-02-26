
import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, Check, Mic, Terminal, Zap, ShieldCheck, Activity, Target, LayoutDashboard, Grid, BarChart3, Infinity as InfinityIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface Step {
    targetId?: string;
    title: string;
    content: string;
    view: 'dashboard' | 'admin' | 'picks' | 'results' | 'kelly' | 'statsedge' | 'superposition' | 'trading-desk' | 'odds' | 'propalpha' | 'binary-alpha';
    position?: 'bottom' | 'top' | 'left' | 'right' | 'center';
    action?: 'connect_arby' | null;
    icon: React.ReactNode;
}

const TOUR_STEPS: Step[] = [
    {
        title: "Protocol Initialization",
        content: "I am 'The System'. This is the Quantum Bets Terminal. We specialize in identifying market pricing dislocations. Let's initialize your operational interface.",
        view: 'picks',
        position: 'center',
        icon: <Terminal className="text-cyan-400" size={24} />
    },
    {
        targetId: 'nav-picks',
        title: "The Daily Alpha",
        content: "Every morning, our RL models output high-confidence positions based on sharp vs. public divergence. If it appears here, the mathematical edge is validated.",
        view: 'picks',
        position: 'bottom',
        icon: <Target className="text-emerald-400" size={24} />
    },
    {
        targetId: 'nav-props',
        title: "Prop Alpha Engine",
        content: "Utilize Pinnacle as the absolute source of truth. We strip the vig from sharp prop lines to expose soft targets on DraftKings and FanDuel.",
        view: 'propalpha',
        position: 'bottom',
        icon: <Zap className="text-purple-400" size={24} />
    },
    {
        targetId: 'nav-statsedge',
        title: "Arbitrage Scanner",
        content: "Hunt for fixed-payout inefficiencies. We identify props on DFS sites like PrizePicks where the implied odds significantly lag the efficient sharp market.",
        view: 'statsedge',
        position: 'bottom',
        icon: <BarChart3 className="text-yellow-400" size={24} />
    },
    {
        targetId: 'nav-superposition',
        title: "Superposition",
        content: "Zero directional risk. Here we identify crossed markets where you can hold contradictory positions that both settle for guaranteed yield.",
        view: 'superposition',
        position: 'bottom',
        icon: <InfinityIcon className="text-pink-400" size={24} />
    },
    {
        targetId: 'nav-odds',
        title: "Global Odds Board",
        content: "Real-time verification. Cross-league market monitoring with integrated neural checking to ensure every line is up-to-the-second accurate.",
        view: 'odds',
        position: 'bottom',
        icon: <Grid className="text-orange-400" size={24} />
    },
    {
        targetId: 'nav-dashboard',
        title: "The Ledger",
        content: "Total transparency. We track every ticket, every unit, and every dollar. Review the equity curve and market exposure analytics.",
        view: 'dashboard',
        position: 'bottom',
        icon: <LayoutDashboard className="text-cyan-400" size={24} />
    },
    {
        targetId: 'nav-arby',
        title: "ARBY Voice Link",
        content: "Head of Trading voice agent. Click this to speak directly with the core model for live strategy, bankroll management, and edge alerts.",
        view: 'picks',
        position: 'bottom',
        action: 'connect_arby',
        icon: <Mic className="text-indigo-400" size={24} />
    }
];

interface TourProps {
    currentView: string;
    setCurrentView: (view: any) => void;
    onLaunchArby?: () => void;
    onComplete: () => void;
}

export const OnboardingTour: React.FC<TourProps> = ({ currentView, setCurrentView, onLaunchArby, onComplete }) => {
    const [stepIndex, setStepIndex] = useState(-1);
    const [isActive, setIsActive] = useState(false);
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const seen = localStorage.getItem('quantum_tour_seen');
        if (!seen) {
            setTimeout(() => {
                setIsActive(true);
                setStepIndex(0);
            }, 1000);
        }
    }, []);

    const currentStep = TOUR_STEPS[stepIndex];

    useEffect(() => {
        if (!isActive || stepIndex < 0) return;

        if (currentView !== currentStep.view) {
            setCurrentView(currentStep.view);
        }

        if (currentStep.targetId) {
            const timer = setTimeout(() => {
                const el = document.getElementById(currentStep.targetId!);
                if (el) {
                    setRect(el.getBoundingClientRect());
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    setRect(null); 
                }
            }, 600); // Slightly increased delay to ensure view render
            return () => clearTimeout(timer);
        } else {
            setRect(null);
        }

    }, [stepIndex, isActive, currentView, setCurrentView, currentStep]);

    const handleNext = () => {
        if (stepIndex < TOUR_STEPS.length - 1) {
            setStepIndex(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        setIsActive(false);
        localStorage.setItem('quantum_tour_seen', 'true');
        onComplete();
    };

    if (!isActive || stepIndex < 0) return null;

    let popoverStyle: React.CSSProperties = {};
    if (rect && currentStep.position !== 'center') {
        const gap = 20;
        if (currentStep.position === 'bottom') {
            popoverStyle = { top: rect.bottom + gap, left: Math.max(20, Math.min(window.innerWidth - 380, rect.left + (rect.width/2) - 180)) };
        } else if (currentStep.position === 'top') {
            popoverStyle = { bottom: window.innerHeight - rect.top + gap, left: Math.max(20, Math.min(window.innerWidth - 380, rect.left + (rect.width/2) - 180)) };
        }
    } else {
        popoverStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    return (
        <div className="fixed inset-0 z-[200] overflow-hidden pointer-events-none">
            <div className="absolute inset-0 pointer-events-auto">
                {rect ? (
                    <div 
                        className="absolute transition-all duration-700 ease-in-out border-2 border-cyan-500 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.9)]"
                        style={{
                            top: rect.top - 8,
                            left: rect.left - 8,
                            width: rect.width + 16,
                            height: rect.height + 16,
                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.9), 0 0 50px rgba(6,182,212,0.4)'
                        }}
                    />
                ) : (
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-md transition-all duration-700" />
                )}
            </div>

            <div 
                className={clsx(
                    "absolute w-[360px] bg-[#05070a] border border-cyan-500/30 rounded-[32px] p-8 shadow-[0_0_80px_rgba(6,182,212,0.2)] transition-all duration-500 flex flex-col pointer-events-auto",
                    !rect && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                )}
                style={rect ? popoverStyle : {}}
            >
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
                            {currentStep.icon}
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-1">PROTO_STEP {stepIndex + 1}</div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none">
                                {currentStep.title}
                            </h3>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-slate-600 hover:text-white p-1">
                        <X size={20} />
                    </button>
                </div>
                
                <p className="text-sm text-slate-400 leading-relaxed mb-8 font-medium border-l border-cyan-500/30 pl-6 italic">
                    "{currentStep.content}"
                </p>

                {currentStep.action === 'connect_arby' && (
                    <button 
                        onClick={() => { if(onLaunchArby) onLaunchArby(); }}
                        className="w-full mb-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-3 shadow-2xl shadow-indigo-500/40 transition-all animate-pulse"
                    >
                        <Mic size={16} /> Establish Link
                    </button>
                )}

                <div className="mt-auto flex justify-between items-center pt-6 border-t border-white/5">
                    <div className="flex gap-1.5">
                        {TOUR_STEPS.map((_, i) => (
                            <div 
                                key={i} 
                                className={clsx(
                                    "w-1 h-1 rounded-full transition-all duration-500",
                                    i === stepIndex ? "bg-cyan-400 w-4" : "bg-slate-800"
                                )}
                            />
                        ))}
                    </div>
                    <button 
                        onClick={handleNext}
                        className="flex items-center gap-2 px-8 py-2.5 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-cyan-400 shadow-xl"
                    >
                        {stepIndex === TOUR_STEPS.length - 1 ? 'Execute' : 'Continue'}
                        {stepIndex === TOUR_STEPS.length - 1 ? <Check size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
                    </button>
                </div>
            </div>
        </div>
    );
};
