
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  FileUp, Edit3, Lock, UploadCloud, Check, Loader2, Trash2, 
  AlertTriangle, FileText, X, AlertCircle, Database, 
  Terminal, Key, RefreshCw, LogOut, ShieldAlert, Cpu, Clock, 
  HardDrive, FileSearch, FileCode, Zap, Target, BarChart3, 
  Settings, Network, Anchor, Shield, Upload, File
} from 'lucide-react';
import { WeekData, GameSummary, League, PickArchiveItem } from '../types';
import { GoogleGenAI } from "@google/genai";
import { supabase } from '../lib/supabase';
import { formatError } from '../utils';
import { clsx } from 'clsx';

interface AdminProps {
  onDataUploaded: (data: WeekData) => void;
  weeks: WeekData[];
  onDeleteReport: (id: string) => void;
  onUpdatePicks: (content: string, filename: string, league: League, fileUrl?: string) => void;
  onUploadSummary: (summary: GameSummary) => void;
  onFactoryReset: () => void;
}

type IngestType = 'POSITIONS' | 'PROPS' | 'RESULTS' | 'SYSTEM';
type PositionSubTab = 'TEAM' | 'PARLAY';

export const Admin: React.FC<AdminProps> = ({ onDataUploaded, weeks, onDeleteReport, onUpdatePicks, onUploadSummary, onFactoryReset }) => {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<IngestType>('POSITIONS');
  const [positionSubTab, setPositionSubTab] = useState<PositionSubTab>('TEAM');
  const [targetLeague, setTargetLeague] = useState<League>('NFL');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processLog, setProcessLog] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Manual Input State
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const addLog = (msg: string) => {
    setProcessLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 20));
  };

  const handleAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthLoading(true);
      try {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
      } catch (err: any) { setAuthError(formatError(err)); }
      finally { setAuthLoading(false); }
  };

  const runOCRAndIngest = async (files: File[] | FileList | null) => {
    if (!files || (files instanceof FileList && files.length === 0)) return;
    const fileArray = files instanceof FileList ? Array.from(files) : files;
    
    setIsProcessing(true);
    addLog(`Initializing Quantum OCR for ${fileArray.length} document(s)...`);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    for (const file of fileArray) {
      try {
        addLog(`Analyzing: ${file.name} (Buffer: ${(file.size / 1024).toFixed(1)} KB)`);
        const text = await file.text();
        
        let prompt = "";
        let responseMime = "text/plain";

        if (activeTab === 'POSITIONS') {
          const typeLabel = positionSubTab === 'TEAM' ? 'Team Single Position' : 'Asymmetrical Parlay';
          prompt = `Extract betting positions for ${targetLeague}. This is specifically for ${typeLabel} picks. 
          Format as high-fidelity markdown Alpha Report. 
          REQUIRED FORMAT PER PICK:
          - **[Team/Selection Name] [Line]** ([Odds]) | Conf: [1-5] | Units: [X.X]u | EV: [+X.X%] | Sharp: [Sharp Price] | Book: [Book Price] | Risks: [Brief Risk Desc]
            [Analysis text immediately following on new line with 2 spaces indent]
          `;
        } else if (activeTab === 'PROPS') {
          prompt = `Extract player prop plays for ${targetLeague}. Find Player, Stat category, Line, Sharp odds (Pinnacle/Circa), and EV calculation. Return as structured markdown compatible with the Alpha Report format.`;
        } else if (activeTab === 'RESULTS') {
          prompt = `Extract performance result JSON matching schema: { "title": string, "date": string, "overallRoi": number, "pools": [ { "name": string, "netProfit": number, "roi": number, "bets": [ { "description": string, "stake": number, "units": number, "odds": string, "result": "WIN"|"LOSS"|"VOID", "profit": number } ] } ] }. Target League: ${targetLeague}.`;
          responseMime = "application/json";
        }

        const result = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `SYSTEM CONTEXT: QuantumBets Admin terminal. TASK: ${prompt}. INPUT DATA: ${text}`,
          config: { responseMimeType: responseMime }
        });

        if (result.text) {
          if (activeTab === 'RESULTS') {
            const parsed = JSON.parse(result.text);
            const entry = { ...parsed, id: `w-${Date.now()}`, league: targetLeague, date: new Date().toISOString() };
            const { error } = await supabase.from('weeks').insert(entry);
            if (error) throw error;
            onDataUploaded(entry);
            addLog(`SUCCESS: Performance Ledger updated.`);
          } else {
            await onUpdatePicks(result.text, file.name, targetLeague);
            addLog(`SUCCESS: ${targetLeague} Alpha Feed Synchronized.`);
          }
        }
      } catch (err) {
        addLog(`ERROR: Ingestion failed for ${file.name}. ${formatError(err)}`);
      }
    }
    setIsProcessing(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      runOCRAndIngest(e.dataTransfer.files);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualContent) return;
    setIsProcessing(true);
    try {
      if (activeTab === 'RESULTS') {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const res = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Convert this text to Results Ledger JSON for ${targetLeague}: ${manualContent}`,
            config: { responseMimeType: "application/json" }
        });
        if (res.text) {
            const parsed = JSON.parse(res.text);
            const entry = { ...parsed, id: `w-${Date.now()}`, league: targetLeague, date: new Date().toISOString() };
            await supabase.from('weeks').insert(entry);
            onDataUploaded(entry);
        }
      } else {
        await onUpdatePicks(manualContent, manualTitle || `Manual_${Date.now()}`, targetLeague);
      }
      addLog(`SUCCESS: Manual entry committed.`);
      setManualContent('');
      setManualTitle('');
    } catch (err) {
      addLog(`ERROR: Manual commit failed.`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!session) return (
      <div className="min-h-screen flex items-center justify-center bg-[#02040a] p-6 selection:bg-indigo-500/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent_70%)] pointer-events-none"></div>
          <form onSubmit={handleAuth} className="w-full max-w-md glass-panel p-10 rounded-[40px] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-500"></div>
              <div className="flex flex-col items-center mb-10">
                  <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/30 mb-6 group-hover:scale-105 transition-transform duration-500 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                      <Lock size={40} className="text-indigo-400" />
                  </div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Terminal Auth</h2>
                  <p className="text-[10px] text-slate-500 font-mono mt-2 uppercase tracking-widest">Quantum Core Access Only</p>
              </div>
              <div className="space-y-4">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ADMIN_ID" className="w-full bg-black/60 border border-slate-800 focus:border-indigo-500 rounded-2xl py-4 px-6 text-white font-mono transition-all outline-none" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="ACCESS_KEY" className="w-full bg-black/60 border border-slate-800 focus:border-indigo-500 rounded-2xl py-4 px-6 text-white font-mono transition-all outline-none" />
                  {authError && <p className="text-rose-500 text-[11px] font-mono text-center">{authError}</p>}
                  <button type="submit" disabled={authLoading} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-xs transition-all shadow-xl">
                      {authLoading ? <RefreshCw className="animate-spin mx-auto" size={18} /> : "AUTHENTICATE"}
                  </button>
              </div>
          </form>
      </div>
  );

  return (
    <div className="max-w-[1800px] mx-auto px-6 py-10 animate-in fade-in duration-1000">
        
        {/* HEADER */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-12 gap-10">
            <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                    <div className="px-4 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">
                        System Ingestion Protocol
                    </div>
                    <div className="flex items-center gap-2 text-emerald-500 font-mono text-[10px] tracking-widest">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> DB_LINK_ACTIVE
                    </div>
                </div>
                <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-none mb-8">
                    Quantum <span className="text-indigo-500">Edge</span> <span className="text-slate-800 text-3xl align-middle font-bold ml-2 tracking-widest">INGESTION</span>
                </h1>

                {/* MAIN TABS */}
                <div className="flex flex-wrap gap-3">
                    {([
                        { id: 'POSITIONS', label: 'NFL Edge', icon: Target },
                        { id: 'PROPS', label: 'Prop Alpha', icon: Zap },
                        { id: 'RESULTS', label: 'Ledger Sync', icon: BarChart3 },
                        { id: 'SYSTEM', label: 'System', icon: Settings }
                    ] as const).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                "px-8 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] transition-all border flex items-center gap-3",
                                activeTab === tab.id 
                                    ? "bg-indigo-600 border-indigo-500 text-white shadow-2xl shadow-indigo-500/20" 
                                    : "bg-[#0a0e17] border-white/5 text-slate-500 hover:text-white hover:border-white/20"
                            )}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-4 bg-[#0a0e17] p-2 rounded-full border border-white/5">
                <div className="flex bg-black/40 rounded-full p-1">
                    {(['NFL', 'NBA', 'NHL', 'MLB'] as League[]).map(l => (
                        <button key={l} onClick={() => setTargetLeague(l)} className={clsx("px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all", targetLeague === l ? "bg-white text-black" : "text-slate-600 hover:text-white")}>
                            {l}
                        </button>
                    ))}
                </div>
                <button onClick={() => supabase.auth.signOut()} className="p-3 text-slate-600 hover:text-rose-500"><LogOut size={20} /></button>
            </div>
        </div>

        {/* SUB-TAB SELECTOR (NFL EDGE SPECIFIC) */}
        {activeTab === 'POSITIONS' && (
            <div className="flex gap-4 mb-8">
                <button 
                    onClick={() => setPositionSubTab('TEAM')}
                    className={clsx(
                        "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                        positionSubTab === 'TEAM' ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "border-slate-800 text-slate-500 hover:text-white"
                    )}
                >
                    Team Plays
                </button>
                <button 
                    onClick={() => setPositionSubTab('PARLAY')}
                    className={clsx(
                        "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                        positionSubTab === 'PARLAY' ? "bg-purple-500/10 border-purple-500 text-purple-400" : "border-slate-800 text-slate-500 hover:text-white"
                    )}
                >
                    Parlay Picks
                </button>
            </div>
        )}

        <div className="grid grid-cols-12 gap-10">
            {/* LEFT COLUMN: INGESTION ZONE */}
            <div className="col-span-12 lg:col-span-8 space-y-8">
                
                {activeTab !== 'SYSTEM' && (
                    <>
                        {/* 1. DRAG & DROP INGESTION */}
                        <div 
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            className={clsx(
                                "bg-[#05070a] rounded-[48px] p-16 border-2 border-dashed transition-all relative overflow-hidden group flex flex-col items-center justify-center text-center",
                                dragActive ? "border-indigo-500 bg-indigo-500/5" : "border-slate-800 hover:border-slate-700",
                                isProcessing && "opacity-50 pointer-events-none"
                            )}
                        >
                            <div className="w-24 h-24 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 mb-8 shadow-inner group-hover:scale-110 transition-transform">
                                {isProcessing ? <Loader2 className="animate-spin text-indigo-400" size={40} /> : <UploadCloud className="text-indigo-400" size={40} />}
                            </div>
                            
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Channel Ingestion</h2>
                            <p className="text-slate-500 text-sm mb-10 max-w-sm font-medium leading-relaxed">
                                Drop <span className="text-indigo-400">MD, TXT, or PDF</span> files here for Neural Parsing. Our RL core will reconcile entries for <span className="text-white">{targetLeague} {activeTab === 'POSITIONS' ? positionSubTab : activeTab}</span>.
                            </p>

                            <div className="flex flex-col gap-4 w-full max-w-xs">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-xl flex items-center justify-center gap-2"
                                >
                                    <FileSearch size={16} /> Choose Files
                                </button>
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    multiple 
                                    onChange={(e) => runOCRAndIngest(e.target.files)} 
                                    className="hidden" 
                                />
                                <div className="text-[9px] text-slate-700 font-black uppercase tracking-widest">
                                    OR DRAG AND DROP DIRECTLY
                                </div>
                            </div>
                        </div>

                        {/* 2. MANUAL OVERRIDE */}
                        <div className="bg-[#05070a] rounded-[48px] p-12 border border-white/5 shadow-2xl">
                            <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3 mb-8">
                                <Edit3 className="text-indigo-400" /> Manual Override
                            </h3>
                            <div className="space-y-6">
                                <input type="text" placeholder="Entry Label (Optional)" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} className="w-full bg-black/40 border border-slate-800 focus:border-indigo-500 rounded-2xl py-5 px-8 text-white font-mono outline-none" />
                                <textarea rows={8} placeholder={`Input raw data for ${targetLeague} ${activeTab.toLowerCase()}...`} value={manualContent} onChange={(e) => setManualContent(e.target.value)} className="w-full bg-black/40 border border-slate-800 focus:border-indigo-500 rounded-[32px] py-8 px-8 text-white font-mono outline-none resize-none custom-scrollbar" />
                                <button onClick={handleManualSubmit} disabled={isProcessing || !manualContent} className="px-12 py-5 bg-white hover:bg-indigo-400 text-black rounded-2xl font-black uppercase tracking-[0.3em] text-xs transition-all disabled:opacity-30">
                                    EXECUTE DB_COMMIT
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'SYSTEM' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-[#05070a] rounded-[48px] p-12 border border-white/5 text-center flex flex-col items-center">
                            <Trash2 className="text-rose-500 mb-6" size={48} />
                            <h4 className="text-xl font-black text-white uppercase mb-4">Hard Purge</h4>
                            <p className="text-slate-500 text-xs mb-8">Delete all local cache and forcing a core re-sync.</p>
                            <button onClick={onFactoryReset} className="w-full py-4 bg-rose-900/20 border border-rose-500 text-rose-500 rounded-xl font-black text-[10px] uppercase tracking-widest">PURGE CACHE</button>
                        </div>
                        <div className="bg-[#05070a] rounded-[48px] p-12 border border-white/5 text-center flex flex-col items-center">
                            <Database className="text-emerald-500 mb-6" size={48} />
                            <h4 className="text-xl font-black text-white uppercase mb-4">Integrity Check</h4>
                            <p className="text-slate-500 text-xs mb-8">Verify all Supabase relational pointers.</p>
                            <button className="w-full py-4 bg-emerald-900/20 border border-emerald-500 text-emerald-500 rounded-xl font-black text-[10px] uppercase tracking-widest">RUN DIAGNOSTICS</button>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT COLUMN: LOGS */}
            <div className="col-span-12 lg:col-span-4 space-y-8">
                <div className="bg-[#08090f] rounded-[40px] border border-white/5 shadow-2xl h-[600px] flex flex-col overflow-hidden">
                    <div className="p-6 bg-black/40 border-b border-white/5 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <Terminal size={18} className="text-indigo-400" />
                            <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Processing_Stream</h4>
                        </div>
                    </div>
                    <div className="flex-grow p-6 overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-3 bg-black/20">
                        {processLog.length > 0 ? processLog.map((log, i) => (
                            <div key={i} className={clsx(
                                "flex gap-3 animate-in slide-in-from-left-2 duration-300",
                                log.includes('SUCCESS') ? "text-emerald-500" : log.includes('ERROR') ? "text-rose-500" : "text-slate-500"
                            )}>
                                <span className="opacity-30">[{i}]</span>
                                <span className="leading-relaxed">{log}</span>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 italic">
                                <Clock size={32} className="mb-4" />
                                <span>Awaiting Data Handshake...</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-[#05070a] rounded-[40px] p-8 border border-white/5">
                    <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                        <HardDrive size={16} className="text-indigo-400" /> Storage_Index
                    </h4>
                    <div className="space-y-4">
                        {weeks.slice(0, 5).map(w => (
                            <div key={w.id} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-indigo-400">
                                        <FileCode size={18} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-white uppercase truncate w-32">{w.title}</div>
                                        <div className="text-[9px] text-slate-600 font-mono">{w.league}</div>
                                    </div>
                                </div>
                                <button onClick={() => onDeleteReport(w.id)} className="text-slate-700 hover:text-rose-500"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-12 flex justify-between items-center text-[10px] text-slate-700 font-mono uppercase tracking-[0.4em]">
            <span>Channel_V2.5 // Handshake: SECURE</span>
            <div className="flex items-center gap-2"><Shield size={14} className="text-indigo-500" /> Encrypted Link Active</div>
        </div>
    </div>
  );
};
