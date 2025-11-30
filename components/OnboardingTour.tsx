
import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface Step {
    targetId?: string;
    title: string;
    content: string;
    view: 'dashboard' | 'admin' | 'picks' | 'results' | 'kelly' | 'statsedge' | 'superposition' | 'trading-desk';
    position?: 'bottom' | 'top' | 'left' | 'right' | 'center';
}

const TOUR_STEPS: Step[] = [
    {
        title: "Welcome to Quantum Bets",
        content: "You have accessed the Noesis Global Trader v2025.1. This proprietary dashboard consolidates algorithmic modeling, arbitrage execution, and bankroll management into a single interface.",
        view: 'picks',
        position: 'center'
    },
    {
        targetId: 'nav-picks',
        title: "Daily Edge Picks",
        content: "Your primary feed. Access daily algorithmic plays, Sunday game summaries, and prop builders here. The model output is updated in real-time based on line movement.",
        view: 'picks',
        position: 'bottom'
    },
    {
        targetId: 'nav-statsedge',
        title: "StatsEdge Arbitrage",
        content: "Exploit market inefficiencies. This tool compares Sharp Sportsbook odds against Square DFS fixed payouts (PrizePicks/Underdog) to identify mathematical EV+ discrepancies.",
        view: 'statsedge',
        position: 'bottom'
    },
    {
        targetId: 'nav-superposition',
        title: "Quantum Superposition",
        content: "The 'Special Sauce'. Learn how to execute risk-free cross-market arbitrage by holding contradictory positions that guarantee yield regardless of the game outcome.",
        view: 'superposition',
        position: 'bottom'
    },
    {
        targetId: 'nav-dashboard',
        title: "Performance Analytics",
        content: "Transparency is key. Track every unit wagered, ROI, and weighted win rates. Our ledger is immutable and synced to the cloud.",
        view: 'dashboard',
        position: 'bottom'
    },
    {
        targetId: 'dashboard-summary',
        title: "Key Metrics",
        content: "Monitor your Net Profit, Total Volume, and ROI at a glance. Toggle between 'Overall', 'Singles', and 'Parlays' to analyze specific strategies.",
        view: 'dashboard',
        position: 'top'
    },
    {
        targetId: 'nav-terminal',
        title: "HFT Trading Desk",
        content: "Ready to execute? Launch the full-screen Trading Terminal for a high-density, real-time grid view of all active markets with hotkey execution support.",
        view: 'picks', // Go back to picks to show nav bar clearly
        position: 'bottom'
    }
];

interface TourProps {
    currentView: string;
    setCurrentView: (view: any) => void;
}

export const OnboardingTour: React.FC<TourProps> = ({ currentView, setCurrentView }) => {
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
        
        // Basic boundary checking to keep on screen
        // (Simplified logic for demo)
    } else {
        popoverStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden">
            
            {/* 1. THE SPOTLIGHT MASK */}
            {/* We use a massive box-shadow on a div that matches the target rect to create a "cutout" effect */}
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
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-all duration-500" />
            )}

            {/* 2. THE CARD */}
            <div 
                className={clsx(
                    "absolute w-[320px] bg-[#0a0e17] border border-cyan-500/30 rounded-xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)] transition-all duration-500 flex flex-col",
                    !rect && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" // Center fallback
                )}
                style={rect ? popoverStyle : {}}
            >
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200 uppercase tracking-wide">
                        {currentStep.title}
                    </h3>
                    <button onClick={handleClose} className="text-slate-500 hover:text-white">
                        <X size={16} />
                    </button>
                </div>
                
                <p className="text-sm text-slate-300 leading-relaxed mb-6 font-medium">
                    {currentStep.content}
                </p>

                <div className="mt-auto flex justify-between items-center">
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
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20"
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
