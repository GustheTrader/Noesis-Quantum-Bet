
import React, { useState, useCallback, useEffect } from 'react';
import { FileUp, Edit3, Lock, Unlock, UploadCloud, Check, Loader2, Trash2, AlertTriangle, FileText, X, AlertCircle, BookOpen, Database, Terminal, Code, Globe, Key, Copy, Play, RefreshCw, LogOut, UserPlus, ShieldAlert, Cpu, Clock, Github, Wifi, HardDrive, RefreshCcw, Calendar, Search, Filter, List, User, FileSearch, FileCode, Layers, CheckCircle2 as CheckCircle, Zap, Target, BarChart3, ChevronDown } from 'lucide-react';
import { WeekData, BetResult, BetType, GameSummary, League } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
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

interface FileLog {
  name: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  message?: string;
  fileUrl?: string;
}

export const Admin: React.FC<AdminProps> = ({ onDataUploaded, weeks, onDeleteReport, onUpdatePicks, onUploadSummary, onFactoryReset }) => {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'automation'>('manual');
  const [targetLeague, setTargetLeague] = useState<League>('NFL');
  
  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Health Check
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [dbErrorDetail, setDbErrorDetail] = useState('');
  
  // Progress State
  const [batchProgress, setBatchProgress] = useState(0);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [processingLogs, setProcessingLogs] = useState<FileLog[]>([]);

  // Drag State
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const runDiagnostics = async () => {
      setDbStatus('checking');
      try {
          const { error } = await supabase.from('weeks').select('count', { count: 'exact', head: true });
          if (error) throw error;
          setDbStatus('connected');
      } catch (e: any) {
          setDbStatus('error');
          setDbErrorDetail(formatError(e));
      }
  };
      
  useEffect(() => {
      if (session) runDiagnostics();
  }, [session]);

  const handleAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthLoading(true);
      try {
          if (isSignUp) {
              const { error } = await supabase.auth.signUp({ email, password });
              if (error) throw error;
              setAuthError("Check email.");
          } else {
              const { error } = await supabase.auth.signInWithPassword({ email, password });
              if (error) throw error;
          }
      } catch (err: any) { setAuthError(formatError(err)); }
      finally { setAuthLoading(false); }
  };

  const processUniversalFile = async (file: File, ai: GoogleGenAI, targetType: 'performance' | 'teams' | 'parlays' | 'summary'): Promise<{ success: boolean; message: string; fileUrl?: string }> => {
    try {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        let aiResponse;
        let targetInstructions = '';

        if (targetType === 'performance') {
            targetInstructions = `Extract JSON: title, date, overallRoi, pools[name, netProfit, roi, bets[description, stake, units, odds, result, profit, betType]]. Target League: ${targetLeague}.`;
        } else if (targetType === 'teams') {
            targetInstructions = `Extract single team picks for ${targetLeague}. Format: '## OFFICIAL POSITIONS\n- **[Team Line]** ([Odds]) | Conf: [1-5] | Units: [u] | EV: [+X%] | Sharp: [Odds] | Book: [Odds] | Risks: [Text]'`;
        } else if (targetType === 'parlays') {
            targetInstructions = `Extract multi-leg parlay bets for ${targetLeague}. Format: '## ASYMMETRICAL PARLAYS\n- **[Team1, Team2]** ([Odds]) | Conf: [1-5] | Units: [u] | EV: [+X%] | Risks: [Text]'`;
        } else if (targetType === 'summary') {
            targetInstructions = `Extract post-game recap analysis for ${targetLeague} as a Markdown string.`;
        }

        const textContent = await file.text();
        aiResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Clean and format for ${targetType} in league ${targetLeague}. ${targetInstructions} DATA: ${textContent}`,
            config: { responseMimeType: targetType === 'performance' ? "application/json" : "text/plain" }
        });

        if (aiResponse.text) {
            const text = aiResponse.text;
            if (targetType === 'performance') {
              const extractedData = JSON.parse(text);
              onDataUploaded({ ...extractedData, id: `w-${Date.now()}`, league: targetLeague });
            } else if (targetType === 'teams' || targetType === 'parlays') {
              onUpdatePicks(text, file.name, targetLeague);
            } else if (targetType === 'summary') {
              onUploadSummary({ id: `sum-${Date.now()}`, title: file.name, date: new Date().toLocaleDateString(), content: text, league: targetLeague });
            }
            return { success: true, message: "Ingested" };
        }
        return { success: false, message: "AI Error" };
    } catch (error: any) { return { success: false, message: formatError(error) }; }
  };

  const handleBatchIngestion = useCallback(async (files: File[], targetType: any) => {
      setIsBatchProcessing(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      for (const file of files) {
          await processUniversalFile(file, ai, targetType);
      }
      setIsBatchProcessing(false);
  }, [targetLeague, onDataUploaded, onUpdatePicks, onUploadSummary]);

  if (!session) return (
      <div className="min-h-screen flex items-center justify-center bg-black">
          <form onSubmit={handleAuth} className="w-full max-w-md glass-panel p-10 rounded-3xl space-y-6">
              <h2 className="text-3xl font-black text-white text-center uppercase tracking-tighter">Admin Login</h2>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white" />
              <button type="submit" disabled={authLoading} className="w-full py-4 bg-indigo-600 rounded-xl font-black text-white uppercase tracking-widest">{authLoading ? '...' : 'Login'}</button>
          </form>
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-12">
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Quantum Ingestion</h1>
            <div className="flex items-center gap-4">
                <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center">
                    {(['NFL', 'NBA', 'NHL', 'MLB'] as League[]).map(l => (
                        <button key={l} onClick={() => setTargetLeague(l)} className={clsx("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest", targetLeague === l ? "bg-indigo-600 text-white" : "text-slate-500")}>{l}</button>
                    ))}
                </div>
                <button onClick={() => supabase.auth.signOut()} className="text-slate-500"><LogOut/></button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="glass-panel p-10 rounded-[40px] border-2 border-dashed border-slate-800 flex flex-col items-center">
                 <Target className="text-emerald-400 mb-6" size={56}/>
                 <h4 className="text-white font-black uppercase mb-2">Team Position Ingest</h4>
                 <p className="text-[10px] text-slate-500 mb-6 uppercase tracking-widest">Routing to {targetLeague} Core</p>
                 <input type="file" multiple onChange={(e) => handleBatchIngestion(Array.from(e.target.files || []), 'teams')} className="text-xs text-slate-500" />
             </div>
             <div className="glass-panel p-10 rounded-[40px] border-2 border-dashed border-slate-800 flex flex-col items-center">
                 <Zap className="text-indigo-400 mb-6" size={56}/>
                 <h4 className="text-white font-black uppercase mb-2">Parlay Sync</h4>
                 <p className="text-[10px] text-slate-500 mb-6 uppercase tracking-widest">Target: {targetLeague} Alpha</p>
                 <input type="file" multiple onChange={(e) => handleBatchIngestion(Array.from(e.target.files || []), 'parlays')} className="text-xs text-slate-500" />
             </div>
        </div>
    </div>
  );
};
