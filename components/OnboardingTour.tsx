
import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, Check, Mic } from 'lucide-react';
import { clsx } from 'clsx';

interface Step {
    targetId?: string;
    title: string;
    content: string;
    view: 'dashboard' | 'admin' | 'picks' | 'results' | 'kelly' | 'statsedge' | 'superposition' | 'trading-desk';
    position?: 'bottom' | 'top' | 'left' | 'right' | 'center';
    action?: 'connect_arby' | null;
}

const TOUR_STEPS: Step[] = [
    {
        title: "SYSTEM ONLINE: WELCOME, TRADER",
        content: "I am 'The Coach'. This is your Quantum Bets Dashboard. We don't gamble here; we trade probability. Let me walk you through the war room.",
        view: 'picks',
        position: 'center'
    },
    {
        targetId: 'nav-arby',
        title: "INITIATE VOICE LINK",
        content: "That's me. ARBY-BOT. I'm your Head of Trading. Click this button anytime to speak directly with the model. I'll give you live edges, math breakdowns, and keep you disciplined.",
        view: 'picks',
        position: 'bottom',
        action: 'connect_arby'
    },
    {
        targetId: 'nav-picks',
        title: "DAILY EDGE FEED",
        content: "This is your alpha. The model outputs official positions here daily. We track Sharp Book vs. Public divergence. If it's on this list, the math says it's +EV.",
        view: 'picks',
        position: 'bottom'
    },
    {
        targetId: 'nav-statsedge',
        title: "ARBITRAGE SCANNER",
        content: "Hunt the inefficiencies. We compare sharp books (Circa/Pinnacle) against fixed-payout DFS sites (PrizePicks). If the gap is wide enough, we strike. Use this tool to build optimal slips.",
        view: 'statsedge',
        position: 'bottom'
    },
    {
        targetId: 'nav-superposition',
        title: "QUANTUM SUPERPOSITION",
        content: "The holy grail. Holding two contradictory positions that BOTH settle for profit. This section tracks cross-market opportunities across Web3, Prediction Markets, and Books.",
        view: 'superposition',
        position: 'bottom'
    },
    {
        targetId: 'nav-dashboard',
        title: "THE LEDGER",
        content: "Feelings don't pay rent. Data does. This is where we track every unit. ROI, Weighted Win Rate, Net Profit. Total transparency. If you aren't tracking, you're just guessing.",
        view: 'dashboard',
        position: 'bottom'
    },
    {
        targetId: 'nav-terminal',
        title: "HFT TERMINAL",
        content: "Ready to go pro? Launch the full-screen Trading Desk. Real-time tick charts, order flow, and rapid execution. Only for those who can handle the speed.",
        view: 'picks',
        position: 'bottom'
    }
];

interface TourProps {
    currentView: string;
    setCurrentView: (view: any) => void;
    onLaunchArby?: () => void;
}

export const OnboardingTour: React.FC<TourProps> = ({ currentView, setCurrentView, onLaunchArby }) => {
    const [stepIndex, setStepIndex] = useState(-1);
    const [isActive, setIsActive] = useState(false);
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        // Check local storage
        const seen = localStorage.getItem('quantum_tour_seen');
        if (!seen) {
            // Slight delay to allow app to mount
            setTimeout(() => {
                setIsActive(true);
                setStepIndex(0);
            }, 1000);
        }
    }, []);

    const currentStep = TOUR_STEPS[stepIndex];

    // Effect to handle view switching and rect calculation
    useEffect(() => {
        if (!isActive || stepIndex < 0) return;

        // 1. Ensure we are on the right page
        if (currentView !== currentStep.view) {
            setCurrentView(currentStep.view);
        }

        // 2. Find target element
        if (currentStep.targetId) {
            // Use a small timeout to allow DOM to render after view switch
            const timer = setTimeout(() => {
                const el = document.getElementById(currentStep.targetId!);
                if (el) {
                    setRect(el.getBoundingClientRect());
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    // Fallback if element not found (e.g. mobile nav hidden)
                    setRect(null); 
                }
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setRect(null); // Center modal
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
    };

    const handleConnectArby = () => {
        if (onLaunchArby) onLaunchArby();
        // Don't close tour immediately, let them connect while reading
    };

    if (!isActive || stepIndex < 0) return null;

    // Calculate Popover Position
    let popoverStyle: React.CSSProperties = {};
    if (rect && currentStep.position !== 'center') {
        const gap = 20;
        if (currentStep.position === 'bottom') {
            popoverStyle = { top: rect.bottom + gap, left: rect.left + (rect.width/2) - 160 };
        } else if (currentStep.position === 'top') {
            popoverStyle = { bottom: window.innerHeight - rect.top + gap, left: rect.left + (rect.width/2) - 160 };
        }
    } else {
        popoverStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none">
            
            {/* 1. THE SPOTLIGHT MASK */}
            {/* We use a massive box-shadow on a div that matches the target rect to create a "cutout" effect */}
            <div className="absolute inset-0 pointer-events-auto">
                {rect ? (
                    <div 
                        className="absolute transition-all duration-500 ease-in-out border-2 border-cyan-400 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.85)]"
                        style={{
                            top: rect.top - 4,
                            left: rect.left - 4,
                            width: rect.width + 8,
                            height: rect.height + 8,
                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.85), 0 0 30px rgba(6,182,212,0.3)'
                        }}
                    />
                ) : (
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm transition-all duration-500" />
                )}
            </div>

            {/* 2. THE CARD */}
            <div 
                className={clsx(
                    "absolute w-[340px] bg-[#0a0e17] border border-cyan-500/30 rounded-xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)] transition-all duration-500 flex flex-col pointer-events-auto",
                    !rect && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" // Center fallback
                )}
                style={rect ? popoverStyle : {}}
            >
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">ONBOARDING PROTOCOL</div>
                        <h3 className="text-lg font-black text-white uppercase tracking-wide leading-tight">
                            {currentStep.title}
                        </h3>
                    </div>
                    <button onClick={handleClose} className="text-slate-500 hover:text-white">
                        <X size={16} />
                    </button>
                </div>
                
                <p className="text-sm text-slate-300 leading-relaxed mb-6 font-medium border-l-2 border-cyan-500/30 pl-4">
                    {currentStep.content}
                </p>

                {currentStep.action === 'connect_arby' && (
                    <button 
                        onClick={handleConnectArby}
                        className="w-full mb-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all animate-pulse"
                    >
                        <Mic size={14} /> Connect to Coach
                    </button>
                )}

                <div className="mt-auto flex justify-between items-center pt-4 border-t border-white/5">
                    <div className="flex gap-1">
                        {TOUR_STEPS.map((_, i) => (
                            <div 
                                key={i} 
                                className={clsx(
                                    "w-1.5 h-1.5 rounded-full transition-colors",
                                    i === stepIndex ? "bg-cyan-400" : "bg-slate-700"
                                )}
                            />
                        ))}
                    </div>
                    <button 
                        onClick={handleNext}
                        className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all border border-slate-700 hover:border-cyan-500"
                    >
                        {stepIndex === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
                        {stepIndex === TOUR_STEPS.length - 1 ? <Check size={14} /> : <ChevronRight size={14} />}
                    </button>
                </div>
                
                {/* Arrow Pointer (Conditional) */}
                {rect && currentStep.position === 'bottom' && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0a0e17] border-t border-l border-cyan-500/30 transform rotate-45"></div>
                )}
                {rect && currentStep.position === 'top' && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0a0e17] border-b border-r border-cyan-500/30 transform rotate-45"></div>
                )}
            </div>

        </div>
    );
};
