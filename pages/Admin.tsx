
import React, { useState, useCallback, useEffect } from 'react';
import { FileUp, Edit3, Lock, Unlock, UploadCloud, Check, Loader2, Trash2, AlertTriangle, FileText, X, AlertCircle, BookOpen, Database, Terminal, Code, Globe, Key, Copy, Play, RefreshCw, LogOut, UserPlus, ShieldAlert, Cpu, Clock, Github, Wifi, HardDrive, RefreshCcw, Calendar, Search, Filter, List, User } from 'lucide-react';
import { WeekData, BetResult, BetType, GameSummary } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';
import { AUTHORIZED_ADMIN } from '../constants';

interface AdminProps {
  onDataUploaded: (data: WeekData) => void;
  weeks: WeekData[];
  onDeleteReport: (id: string) => void;
  onUpdatePicks: (content: string, filename: string) => void;
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
  
  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Health Check
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [dbErrorDetail, setDbErrorDetail] = useState('');
  const [writeTestStatus, setWriteTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Manual Upload State
  const [uploadDate, setUploadDate] = useState('');
  const [isPdfDragging, setIsPdfDragging] = useState(false);
  const [pdfMsg, setPdfMsg] = useState("Drag & Drop PDF Reports");
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);
  const [processingLogs, setProcessingLogs] = useState<FileLog[]>([]);

  const [isPicksDragging, setIsPicksDragging] = useState(false);
  const [picksMsg, setPicksMsg] = useState("Drag & Drop MD/TXT Files");
  const [isPicksProcessing, setIsPicksProcessing] = useState(false);

  const [isSumDragging, setIsSumDragging] = useState(false);
  const [sumMsg, setSumMsg] = useState("Drag & Drop Summary MD");
  const [isSumProcessing, setIsSumProcessing] = useState(false);

  const [isPropDragging, setIsPropDragging] = useState(false);
  const [propMsg, setPropMsg] = useState("Drag & Drop Props MD/TXT");
  const [isPropProcessing, setIsPropProcessing] = useState(false);

  // Filtering State
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  // --- HELPERS ---
  const stripCodeFences = (text: string) => {
      return text.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
  };

  const formatError = (err: any): string => {
      if (!err) return "Unknown Error";
      if (err instanceof Error) return err.message;
      if (typeof err === 'object') {
          return err.message || err.error_description || JSON.stringify(err);
      }
      return String(err);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const runDiagnostics = async () => {
      setDbStatus('checking');
      setDbErrorDetail('');
      
      // 1. Read Test (Weeks)
      try {
          const { error } = await supabase.from('weeks').select('count', { count: 'exact', head: true });
          if (error) throw error;
          
          // 2. Read Test (Picks) - ensure table exists
          const { error: picksError } = await supabase.from('picks').select('count', { count: 'exact', head: true });
          if (picksError) throw picksError;

          setDbStatus('connected');
      } catch (e: any) {
          console.error("DB Read Failed:", e);
          setDbStatus('error');
          setDbErrorDetail(formatError(e));
      }
  };

  const runWriteTest = async () => {
      setWriteTestStatus('testing');
      try {
          const testId = `test-${Date.now()}`;
          const { error } = await supabase.from('weeks').insert({
              id: testId,
              title: "WRITE_TEST",
              "overallRoi": 0,
              pools: []
          });
          
          if (error) throw error;
          
          // Cleanup
          await supabase.from('weeks').delete().eq('id', testId);
          setWriteTestStatus('success');
      } catch (e: any) {
          console.error("Write Test Failed:", e);
          setWriteTestStatus('error');
          alert(`WRITE TEST FAILED: ${formatError(e)}\n\nSolution: Run the SQL Script in 'lib/supabase.ts' in your Supabase Dashboard.`);
      }
  };
      
  useEffect(() => {
      if (session) runDiagnostics();
  }, [session]);


  const handleAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthLoading(true);
      setAuthError('');
      try {
          if (isSignUp) {
              const { error } = await supabase.auth.signUp({ email, password });
              if (error) throw error;
              setAuthError("Account created! Please check your email to confirm, or if auto-confirm is on, sign in.");
              setIsSignUp(false);
          } else {
              const { error } = await supabase.auth.signInWithPassword({ email, password });
              if (error) throw error;
          }
      } catch (err: any) {
          setAuthError(formatError(err));
      } finally {
          setAuthLoading(false);
      }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
  };

  // --- PDF Logic ---
  const processSingleFile = async (file: File, ai: GoogleGenAI): Promise<{ success: boolean; message: string; fileUrl?: string }> => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        let finalFileUrl = undefined;

        // 1. Upload to Supabase Storage ('reports' bucket)
        try {
            const { error: uploadError } = await supabase.storage.from('reports').upload(fileName, file);
            if (!uploadError) {
                const { data } = supabase.storage.from('reports').getPublicUrl(fileName);
                if (data && data.publicUrl) {
                    finalFileUrl = data.publicUrl;
                    console.log("File Uploaded:", finalFileUrl);
                }
            } else {
                console.warn("PDF Upload Warning:", uploadError.message);
                if (uploadError.message.includes('bucket not found')) {
                    return { success: false, message: "Storage bucket 'reports' missing. Check SQL." };
                }
            }
        } catch (err) {
            console.warn("Storage exception:", err);
        }

        // 2. AI Processing
        const base64Data = await fileToBase64(file);
        const base64Content = base64Data.split(',')[1];
        
        // Updated Prompt to ensure UNITS are calculated if missing
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: file.type || 'application/pdf', data: base64Content } },
                    { text: "Extract betting performance. JSON: title, date, overallRoi (number), pools[name, netProfit (number), roi (number), bets[description, stake (number), units (number), odds (string), result (WIN/LOSS/VOID), profit (number), betType (SINGLE/PARLAY)]]. IMPORTANT: If 'units' is not explicitly listed, calculate it as (stake / 100)." }
                ]
            },
            config: { responseMimeType: "application/json" }
        });

        if (response.text) {
            const extractedData = JSON.parse(response.text);
            
            const dateStr = uploadDate ? new Date(uploadDate).toLocaleDateString() : (extractedData.date || new Date().toLocaleDateString());

            const newWeekData: WeekData = {
                id: `w-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: file.name.replace(/\.[^/.]+$/, ""), 
                date: dateStr,
                overallRoi: Math.round(extractedData.overallRoi || 0),
                fileUrl: finalFileUrl, // Store the URL!
                pools: (extractedData.pools || []).map((pool: any, pIdx: number) => ({
                    id: `p-${Date.now()}-${pIdx}`,
                    name: pool.name || "Pool",
                    netProfit: pool.netProfit || 0,
                    roi: Math.round(pool.roi || 0),
                    bets: (pool.bets || []).map((bet: any, bIdx: number) => ({
                        id: `b-${Date.now()}-${pIdx}-${bIdx}`,
                        description: bet.description || "Bet",
                        stake: bet.stake || 0,
                        units: bet.units || (bet.stake ? bet.stake / 100 : 0), // Fallback calculation
                        odds: bet.odds,
                        result: (bet.result as BetResult) || BetResult.PENDING,
                        profit: bet.profit || 0,
                        betType: (bet.betType as BetType) || 'SINGLE'
                    }))
                }))
            };
            onDataUploaded(newWeekData);
            return { success: true, message: finalFileUrl ? "Processed & Saved" : "Processed (No File)", fileUrl: finalFileUrl };
        }
        return { success: false, message: "AI returned empty" };
    } catch (error: any) { 
        return { success: false, message: formatError(error) }; 
    }
  };

  const handlePdfFiles = useCallback(async (files: File[]) => {
      const validFiles = files.filter(f => f.type === 'application/pdf' || f.type.startsWith('image/'));
      if (validFiles.length > 0) {
        setIsPdfProcessing(true);
        setProcessingLogs(validFiles.map(f => ({ name: f.name, status: 'pending' })));
        setPdfMsg("Uploading...");

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let successCount = 0;
        let failCount = 0;
        
        for (const file of validFiles) {
            setProcessingLogs(prev => prev.map(log => log.name === file.name ? { ...log, status: 'processing' } : log));
            const result = await processSingleFile(file, ai);
            if (result.success) {
                successCount++;
                setProcessingLogs(prev => prev.map(log => log.name === file.name ? { ...log, status: 'success', message: result.message, fileUrl: result.fileUrl } : log));
            } else {
                failCount++;
                setProcessingLogs(prev => prev.map(log => log.name === file.name ? { ...log, status: 'error', message: result.message } : log));
            }
        }
        setIsPdfProcessing(false);
        setPdfMsg(failCount === 0 ? `Done: ${successCount} Saved` : `${successCount} Saved, ${failCount} Failed`);
        setTimeout(() => { setProcessingLogs([]); setPdfMsg("Drag & Drop PDF Reports"); }, 5000);
      }
  }, [onDataUploaded, uploadDate]);

  // Wrappers
  const onPdfDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsPdfDragging(true); }, []);
  const onPdfDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsPdfDragging(false); }, []);
  const onPdfDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsPdfDragging(false); if (e.dataTransfer.files.length) handlePdfFiles(Array.from(e.dataTransfer.files)); }, [handlePdfFiles]);
  const onPdfManual = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.length) handlePdfFiles(Array.from(e.target.files)); };
  
  const handlePicksFiles = useCallback(async (files: File[]) => {
      const file = files[0];
      if (file) {
          setIsPicksProcessing(true);
          setPicksMsg("AI Formatting...");
          try {
             const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
             const base64Data = await fileToBase64(file);
             
             // STRICT TEAM PICKS FORMAT PROMPT
             // Updated to force specific structure for Cards in Picks.tsx
             const prompt = `Convert the attached betting sheet into a structured HFT report.
             
             CRITICAL RULES:
             1. **NO MARKDOWN HEADERS**. Use UPPERCASE plain text for section titles (e.g., "OFFICIAL POSITIONS").
             2. **CARD FORMATTING**: For each pick, you MUST use this exact syntax:
                - **TeamName Line** (Odds): Analysis...
             
             Example:
             - **Lions -3.0** (-110): Detroit coming off a bye week is historically 82% ATS.
             - **Chiefs -3.5** (-105): Mahomes at home is an auto-play.
             
             Do not use code blocks. Return raw text with bolding notation only.`;

             const response = await ai.models.generateContent({
                 model: 'gemini-2.5-flash',
                 contents: { parts: [{ inlineData: { mimeType: file.type || 'text/plain', data: base64Data.split(',')[1] } }, { text: prompt }] }
             });
             if (response.text) {
                 onUpdatePicks(stripCodeFences(response.text), file.name.replace(/\.[^/.]+$/, ""));
                 setPicksMsg("Saved!");
             }
          } catch (e) { setPicksMsg(`Error: ${formatError(e)}`); }
          finally { setIsPicksProcessing(false); setTimeout(() => setPicksMsg("Drag & Drop MD/TXT"), 3000); }
      }
  }, [onUpdatePicks]);

  const onPicksDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsPicksDragging(false); if (e.dataTransfer.files.length) handlePicksFiles(Array.from(e.dataTransfer.files)); }, [handlePicksFiles]);
  const onPicksManual = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.length) handlePicksFiles(Array.from(e.target.files)); };

  const handleSummaryFiles = useCallback(async (files: File[]) => {
      const file = files[0];
      if (file) {
          setIsSumProcessing(true);
          setSumMsg("Processing...");
          try {
             const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
             const base64Data = await fileToBase64(file);
             
             const prompt = `Extract Game Summary. 
             Return JSON: { title: string, date: string (YYYY-MM-DD), content: string }.
             IMPORTANT: The 'content' field must be plain text with **bold** highlights only. NO markdown headers (#). Use UPPERCASE for titles within the content.`;

             const response = await ai.models.generateContent({
                 model: 'gemini-2.5-flash',
                 contents: { parts: [{ inlineData: { mimeType: file.type || 'text/plain', data: base64Data.split(',')[1] } }, { text: prompt }] },
                 config: { responseMimeType: "application/json" }
             });
             if (response.text) {
                 const d = JSON.parse(response.text);
                 onUploadSummary({ id: `sum-${Date.now()}`, title: d.title || "Summary", date: d.date || "Today", content: stripCodeFences(d.content || "") });
                 setSumMsg("Saved!");
             }
          } catch (e) { setSumMsg(`Error: ${formatError(e)}`); }
          finally { setIsSumProcessing(false); setTimeout(() => setSumMsg("Drag & Drop Summary MD"), 3000); }
      }
  }, [onUploadSummary]);
  const onSumDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsSumDragging(false); if (e.dataTransfer.files.length) handleSummaryFiles(Array.from(e.dataTransfer.files)); }, [handleSummaryFiles]);
  const onSumManual = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.length) handleSummaryFiles(Array.from(e.target.files)); };

  const handlePropFiles = useCallback(async (files: File[]) => {
      const file = files[0];
      if (file) {
          setIsPropProcessing(true);
          setPropMsg("AI Extracting...");
          try {
             const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
             const base64Data = await fileToBase64(file);
             const response = await ai.models.generateContent({
                 model: 'gemini-2.5-flash',
                 contents: { parts: [{ inlineData: { mimeType: file.type || 'text/plain', data: base64Data.split(',')[1] } }, { text: "Extract Player Props. JSON Array format: [{ player (string), stat (string), line (number), side (OVER/UNDER), book_odds (number, e.g -110), dfs_implied (number), ev (number), best_platform (string) }]." }] },
                 config: { responseMimeType: "application/json" }
             });
             
             if (response.text) {
                 const props = JSON.parse(response.text);
                 const { error } = await supabase.from('market_scans').insert(props.map((p: any) => ({
                     player: p.player,
                     stat: p.stat,
                     line: p.line,
                     side: p.side,
                     book_odds: p.book_odds,
                     dfs_implied: p.dfs_implied,
                     ev: p.ev,
                     best_platform: p.best_platform
                 })));
                 
                 if (error) throw error;
                 setPropMsg("Saved to DB!");
             }
          } catch (e) { setPropMsg(`Error: ${formatError(e)}`); }
          finally { setIsPropProcessing(false); setTimeout(() => setPropMsg("Drag & Drop Props MD/TXT"), 3000); }
      }
  }, []);
  const onPropDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsPropDragging(false); if (e.dataTransfer.files.length) handlePropFiles(Array.from(e.dataTransfer.files)); }, [handlePropFiles]);
  const onPropManual = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.length) handlePropFiles(Array.from(e.target.files)); };


  // --- FILTERING LOGIC ---
  const filteredWeeks = weeks.filter(w => {
      const searchLower = filterSearch.toLowerCase();
      const matchesSearch = !filterSearch || 
          w.title.toLowerCase().includes(searchLower) || 
          w.id.toLowerCase().includes(searchLower);
      
      let matchesDate = true;
      if (filterStart || filterEnd) {
          const wDate = new Date(w.date || '');
          if (!isNaN(wDate.getTime())) {
              if (filterStart) {
                  const start = new Date(filterStart);
                  if (wDate < start) matchesDate = false;
              }
              if (filterEnd && matchesDate) {
                  const end = new Date(filterEnd);
                  end.setHours(23, 59, 59, 999);
                  if (wDate > end) matchesDate = false;
              }
          }
      }
      return matchesSearch && matchesDate;
  });


  // --- AUTH RENDER ---
  if (!session) {
      return (
          <div className="min-h-screen flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-[#0a0e17] border border-slate-800 rounded-2xl p-8 shadow-2xl">
                  <div className="text-center mb-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                          <Lock size={32} className="text-white" />
                      </div>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Admin Console</h2>
                      <p className="text-slate-400 text-sm mt-2">QuantumEdge Neural Uplink</p>
                  </div>

                  <form onSubmit={handleAuth} className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Credentials</label>
                          <div className="relative group">
                              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-rose-500 transition-colors" />
                              <input 
                                  type="email" 
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  placeholder="admin@quantumbets.com"
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white text-sm focus:border-rose-500 focus:outline-none transition-colors"
                                  required
                              />
                          </div>
                      </div>
                      <div>
                          <div className="relative group">
                              <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-rose-500 transition-colors" />
                              <input 
                                  type="password" 
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  placeholder="••••••••"
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white text-sm focus:border-rose-500 focus:outline-none transition-colors"
                                  required
                              />
                          </div>
                      </div>

                      {authError && (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded text-rose-400 text-xs font-bold flex items-center gap-2">
                              <AlertCircle size={14} />
                              {authError}
                          </div>
                      )}

                      <button 
                          type="submit" 
                          disabled={authLoading}
                          className="w-full py-3 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-bold uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                          {authLoading ? <Loader2 size={16} className="animate-spin" /> : (isSignUp ? 'Initialize Access' : 'Authenticate')}
                      </button>
                  </form>

                  <div className="mt-6 text-center">
                      <button 
                          onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }}
                          className="text-xs text-slate-500 hover:text-white underline transition-colors"
                      >
                          {isSignUp ? 'Already have access? Login' : 'Request Access Protocol (Sign Up)'}
                      </button>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-slate-800 text-[10px] text-slate-600 text-center font-mono">
                      SECURE CONNECTION :: V2025.2.1
                  </div>
              </div>
          </div>
      );
  }

  // --- MAIN RENDER ---
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center mb-12">
            <div>
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-600 uppercase tracking-tighter">
                    QuantumEdge v.2
                </h1>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Data Ingestion Console</p>
            </div>
            <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-3">
                    <span className="text-xs text-emerald-500 font-mono hidden md:block">{session.user.email}</span>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-all text-xs font-bold uppercase"><LogOut size={14} /> Logout</button>
                </div>
                
                {/* Enhanced Health Check */}
                <div className="flex items-center gap-2 text-[10px] font-mono bg-black/40 px-3 py-1.5 rounded-full border border-slate-800">
                    <div className="flex items-center gap-1">
                        <Database size={10} className={dbStatus === 'connected' ? "text-emerald-400" : "text-rose-400"} />
                        <span className={dbStatus === 'connected' ? "text-emerald-400" : "text-rose-400"}>
                            DB: {dbStatus === 'checking' ? '...' : dbStatus === 'connected' ? 'OK' : 'ERR'}
                        </span>
                    </div>
                    <div className="w-px h-3 bg-slate-700"></div>
                     <button onClick={runWriteTest} disabled={writeTestStatus === 'testing'} className={`flex items-center gap-1 hover:underline ${writeTestStatus === 'error' ? 'text-rose-400' : 'text-slate-400'}`}>
                         {writeTestStatus === 'testing' ? <Loader2 size={10} className="animate-spin" /> : <Edit3 size={10} />}
                         {writeTestStatus === 'idle' ? 'Test Write' : writeTestStatus === 'success' ? 'Write OK' : 'Write Fail'}
                     </button>
                </div>
                {dbErrorDetail && <div className="text-[9px] text-rose-500 max-w-[200px] text-right truncate">{dbErrorDetail}</div>}
            </div>
        </div>

        {/* Warning if not primary admin */}
        {session.user.email !== AUTHORIZED_ADMIN && (
            <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3 text-yellow-200 text-sm">
                <AlertTriangle size={20} className="shrink-0" />
                <div>
                    <strong>Guest Admin Access:</strong> You are logged in as {session.user.email}. You can view the dashboard, but database writes may be restricted by RLS policies if your user ID is not authorized.
                </div>
            </div>
        )}

        {/* --- Tabs & Uploaders --- */}
        <div className="flex justify-center mb-8">
            <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-800 flex gap-1">
                <button onClick={() => setActiveTab('manual')} className={`px-6 py-2 rounded-lg text-sm font-bold uppercase ${activeTab === 'manual' ? 'bg-cyan-500 text-black' : 'text-slate-400'}`}>Manual Ingestion</button>
                <button onClick={() => setActiveTab('automation')} className={`px-6 py-2 rounded-lg text-sm font-bold uppercase ${activeTab === 'automation' ? 'bg-purple-500 text-white' : 'text-slate-400'}`}>API Gateway</button>
            </div>
        </div>

        {activeTab === 'manual' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                 <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 flex flex-col items-center justify-center text-center relative overflow-hidden" onDragOver={onPdfDragOver} onDragLeave={onPdfDragLeave} onDrop={onPdfDrop}>
                     {isPdfDragging && <div className="absolute inset-0 bg-cyan-500/10 z-10 flex items-center justify-center backdrop-blur-sm"><span className="font-bold text-cyan-400">DROP HERE</span></div>}
                     
                     {isPdfProcessing ? <Loader2 className="animate-spin text-cyan-400 mb-2" size={32}/> : <UploadCloud className="text-cyan-400 mb-2" size={32}/>}
                     <h4 className="text-white font-bold">{pdfMsg}</h4>
                     
                     {/* Manual Date Override */}
                     <div className="mt-4 w-full bg-slate-900/50 p-2 rounded border border-slate-700/50 text-left">
                         <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Report Date</label>
                         <div className="flex items-center gap-2">
                             <Calendar size={12} className="text-slate-500"/>
                             <input 
                                type="date" 
                                value={uploadDate} 
                                onChange={(e) => setUploadDate(e.target.value)}
                                className="bg-transparent text-xs text-white focus:outline-none w-full font-mono"
                             />
                         </div>
                     </div>

                     <input type="file" multiple accept=".pdf,image/*" onChange={onPdfManual} className="mt-4 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-cyan-500 file:text-black hover:file:bg-cyan-400" />
                     {processingLogs.length > 0 && <div className="mt-2 text-xs text-left w-full max-h-32 overflow-y-auto"><div className="font-bold text-slate-500 mb-1">Log:</div>{processingLogs.map((l,i)=><div key={i} className={l.status==='error'?'text-rose-500':'text-emerald-500 flex justify-between'}><span>{l.name}</span><span className="uppercase text-[9px] flex items-center gap-1">{l.status} {l.fileUrl && <Check size={8}/>}</span></div>)}</div>}
                 </div>
                 
                 <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 text-center flex flex-col items-center justify-center relative" onDragOver={onPicksDrop} onDragLeave={() => setIsPicksDragging(false)} onDrop={onPicksDrop}>
                    {isPicksDragging && <div className="absolute inset-0 bg-emerald-500/10 z-10 flex items-center justify-center backdrop-blur-sm"><span className="font-bold text-emerald-400">DROP HERE</span></div>}
                    {isPicksProcessing ? <Loader2 className="animate-spin text-emerald-400 mb-2" size={32}/> : <FileText className="text-emerald-400 mb-2" size={32}/>}
                    <h4 className="text-white font-bold mb-2">Team Picks (MD)</h4>
                    <input type="file" accept=".md,.txt" onChange={onPicksManual} className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-500 file:text-black hover:file:bg-emerald-400" />
                    <p className="text-xs text-emerald-400 mt-2">{picksMsg}</p>
                 </div>
                 
                 <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 text-center flex flex-col items-center justify-center relative" onDragOver={onSumDrop} onDragLeave={() => setIsSumDragging(false)} onDrop={onSumDrop}>
                    {isSumDragging && <div className="absolute inset-0 bg-amber-500/10 z-10 flex items-center justify-center backdrop-blur-sm"><span className="font-bold text-amber-400">DROP HERE</span></div>}
                    {isSumProcessing ? <Loader2 className="animate-spin text-amber-400 mb-2" size={32}/> : <BookOpen className="text-amber-400 mb-2" size={32}/>}
                    <h4 className="text-white font-bold mb-2">Game Summary (MD)</h4>
                    <input type="file" accept=".md,.txt" onChange={onSumManual} className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-black hover:file:bg-amber-400" />
                    <p className="text-xs text-amber-400 mt-2">{sumMsg}</p>
                 </div>

                 <div className="glass-panel p-6 rounded-2xl border border-purple-500/30 text-center flex flex-col items-center justify-center relative" onDragOver={onPropDrop} onDragLeave={() => setIsPropDragging(false)} onDrop={onPropDrop}>
                    {isPropDragging && <div className="absolute inset-0 bg-purple-500/10 z-10 flex items-center justify-center backdrop-blur-sm"><span className="font-bold text-purple-400">DROP HERE</span></div>}
                    {isPropProcessing ? <Loader2 className="animate-spin text-purple-400 mb-2" size={32}/> : <List className="text-purple-400 mb-2" size={32}/>}
                    <h4 className="text-white font-bold mb-2">Player Props (MD)</h4>
                    <input type="file" accept=".md,.txt" onChange={onPropManual} className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-500 file:text-white hover:file:bg-purple-400" />
                    <p className="text-xs text-purple-400 mt-2">{propMsg}</p>
                 </div>
            </div>
        )}

        {/* Database Table with Filter Bar */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-700">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                 <h3 className="text-xl font-bold text-white flex items-center gap-2">
                     <Database className="text-slate-400" size={20} />
                     Database Records
                 </h3>
                 
                 {/* Filter Bar */}
                 <div className="flex flex-wrap gap-3 items-center bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                     <div className="relative group">
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400" size={14} />
                         <input 
                            type="text" 
                            placeholder="Search title/id..." 
                            value={filterSearch}
                            onChange={(e) => setFilterSearch(e.target.value)}
                            className="bg-black/30 border border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 w-32 md:w-48 placeholder:text-slate-600 transition-all"
                         />
                     </div>
                     <div className="h-4 w-px bg-slate-800"></div>
                     <div className="flex items-center gap-2">
                         <Calendar className="text-slate-500" size={14} />
                         <input 
                            type="date" 
                            value={filterStart}
                            onChange={(e) => setFilterStart(e.target.value)}
                            className="bg-black/30 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-cyan-500 outline-none w-28"
                         />
                         <span className="text-slate-600 text-xs">-</span>
                         <input 
                            type="date" 
                            value={filterEnd}
                            onChange={(e) => setFilterEnd(e.target.value)}
                            className="bg-black/30 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-cyan-500 outline-none w-28"
                         />
                     </div>
                     {(filterStart || filterEnd || filterSearch) && (
                         <button 
                            onClick={() => { setFilterStart(''); setFilterEnd(''); setFilterSearch(''); }}
                            className="p-1.5 text-slate-500 hover:text-white bg-slate-800 hover:bg-rose-900 rounded transition-colors"
                            title="Clear Filters"
                         >
                             <X size={12} />
                         </button>
                     )}
                 </div>
             </div>

             <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-slate-400">
                     <thead>
                         <tr className="border-b border-slate-700 bg-slate-900/30">
                             <th className="py-3 px-4 font-mono text-xs uppercase tracking-wider text-slate-500">ID</th>
                             <th className="py-3 px-4 font-mono text-xs uppercase tracking-wider text-slate-500">Date</th>
                             <th className="py-3 px-4 text-white font-bold">Title</th>
                             <th className="py-3 px-4 text-right">Action</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-800">
                         {filteredWeeks.length > 0 ? (
                             filteredWeeks.map(w => (
                                 <tr key={w.id} className="hover:bg-white/5 transition-colors group">
                                     <td className="py-3 px-4 font-mono text-xs text-slate-500 group-hover:text-slate-300">{w.id}</td>
                                     <td className="py-3 px-4 font-mono text-xs text-cyan-400/70 group-hover:text-cyan-400">{w.date || '-'}</td>
                                     <td className="py-3 px-4 text-white font-medium">{w.title}</td>
                                     <td className="py-3 px-4 text-right">
                                         <button 
                                            onClick={() => onDeleteReport(w.id)} 
                                            className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-950/30 rounded transition-all"
                                            title="Delete Record"
                                         >
                                             <Trash2 size={16}/>
                                         </button>
                                     </td>
                                 </tr>
                             ))
                         ) : (
                             <tr>
                                 <td colSpan={4} className="py-8 text-center text-slate-500 italic">
                                     No records found matching your filters.
                                 </td>
                             </tr>
                         )}
                     </tbody>
                 </table>
             </div>
             
             <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-600 flex justify-between items-center">
                 <span>Showing {filteredWeeks.length} of {weeks.length} records</span>
                 {activeTab === 'automation' && <span className="text-purple-500 flex items-center gap-1"><Cpu size={12}/> Automation Active</span>}
             </div>
        </div>
    </div>
  );
};
