import React from 'react';

interface GnoesisLogoProps {
  size?: number;
  className?: string;
}

export const GnoesisLogoIcon: React.FC<GnoesisLogoProps> = ({ size = 48, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 120 120" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] ${className}`}
  >
    <defs>
      <linearGradient id="gnoesis-brushed-chrome" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="15%" stopColor="#e2e8f0" />
        <stop offset="35%" stopColor="#94a3b8" />
        <stop offset="50%" stopColor="#cbd5e1" />
        <stop offset="70%" stopColor="#64748b" />
        <stop offset="85%" stopColor="#e2e8f0" />
        <stop offset="100%" stopColor="#ffffff" />
      </linearGradient>
      <linearGradient id="gnoesis-inner-bevel" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#334155" />
        <stop offset="50%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#f8fafc" />
      </linearGradient>
      <radialGradient id="rivet-sheen" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="40%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#475569" />
      </radialGradient>
      <filter id="metal-shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#020617" floodOpacity="0.8" />
      </filter>
    </defs>

    {/* Main Brushed Steel G Body with Bubble Pointer */}
    <path 
      d="M 68 18 
         A 44 44 0 1 0 74 104 
         L 94 104 
         L 94 54 
         L 52 54 
         L 52 68 
         L 80 68 
         L 80 90 
         A 30 30 0 1 1 64 32 
         Z" 
      fill="url(#gnoesis-brushed-chrome)" 
      stroke="#1e293b" 
      strokeWidth="1.5"
      filter="url(#metal-shadow)"
    />

    {/* Sharp Bubble Pointer at Bottom Left */}
    <path 
      d="M 28 84 L 10 102 L 38 96 Z" 
      fill="url(#gnoesis-brushed-chrome)" 
      stroke="#1e293b" 
      strokeWidth="1.5"
      strokeLinejoin="round"
    />

    {/* Diagonal Wand / Pin Rod */}
    <rect 
      x="40" 
      y="54" 
      width="64" 
      height="8" 
      rx="4" 
      transform="rotate(-45 40 54)" 
      fill="url(#gnoesis-inner-bevel)" 
      stroke="#1e293b" 
      strokeWidth="1"
      filter="url(#metal-shadow)"
    />

    {/* Top Right Circular Cap on the Wand */}
    <circle 
      cx="92" 
      cy="20" 
      r="11" 
      fill="url(#rivet-sheen)" 
      stroke="#1e293b" 
      strokeWidth="1.5"
      filter="url(#metal-shadow)"
    />
    <circle cx="92" cy="20" r="7" fill="url(#gnoesis-brushed-chrome)" />

    {/* Precision Rivet Studs around G arc and bar */}
    {[
      { cx: 50, cy: 22 },
      { cx: 36, cy: 28 },
      { cx: 25, cy: 39 },
      { cx: 20, cy: 53 },
      { cx: 21, cy: 68 },
      { cx: 29, cy: 80 },
      { cx: 42, cy: 90 },
      { cx: 56, cy: 94 },
      { cx: 64, cy: 61 },
      { cx: 74, cy: 61 },
      { cx: 86, cy: 61 },
      { cx: 87, cy: 75 },
      { cx: 87, cy: 87 },
      { cx: 87, cy: 98 }
    ].map((rivet, idx) => (
      <circle 
        key={idx} 
        cx={rivet.cx} 
        cy={rivet.cy} 
        r="3" 
        fill="url(#rivet-sheen)" 
        stroke="#0f172a" 
        strokeWidth="0.8" 
      />
    ))}
  </svg>
);

export const GnoesisBrandText: React.FC<{ textSizeClass?: string; subSizeClass?: string }> = ({ 
  textSizeClass = "text-2xl lg:text-3xl", 
  subSizeClass = "text-[10px] lg:text-xs" 
}) => (
  <div className="flex flex-col justify-center text-center select-none">
    <div className="flex items-center justify-center tracking-[0.12em] font-serif uppercase">
      <span className={`${textSizeClass} font-normal text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400 drop-shadow-md`}>
        GNO
      </span>
      {/* Stylized Greek Xi E */}
      <span className={`${textSizeClass} font-bold text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 via-slate-300 to-slate-500 mx-[1px]`}>
        Ξ
      </span>
      <span className={`${textSizeClass} font-normal text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400 drop-shadow-md`}>
        SIS
      </span>
    </div>
    <span className={`${subSizeClass} font-sans font-medium text-slate-400 tracking-[0.35em] uppercase -mt-1`}>
      LABS
    </span>
  </div>
);
