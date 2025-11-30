
import React, { useState, useCallback, useEffect } from 'react';
import { FileUp, Edit3, Lock, Unlock, UploadCloud, Check, Loader2, Trash2, AlertTriangle, FileText, X, AlertCircle, BookOpen, Database, Terminal, Code, Globe, Key, Copy, Play, RefreshCw, LogOut, UserPlus, ShieldAlert, Cpu, Clock, Github, Wifi, HardDrive } from 'lucide-react';
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
}

export const Admin: React.FC<AdminProps> = ({ onDataUploaded, weeks, onDeleteReport, onUpdatePicks, onUploadSummary, onFactoryReset }) => {
  const [session, setSession] = useState<any>(null);
  
  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const [activeTab, setActiveTab] = useState<'manual' | 'automation'>('manual');
  
  // Health Check State
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [storageStatus, setStorageStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  // --- Automation State ---
  const [openAIKey, setOpenAIKey] = useState('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');
  const [targetSite, setTargetSite] = useState('https://www.bettingpros.com/nfl/props/');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // --- PDF State ---
  const [isPdfDragging, setIsPdfDragging] = useState(false);
  const [pdfMsg, setPdfMsg] = useState("Drag & Drop PDF Reports");
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);
  const [processingLogs, setProcessingLogs] = useState<FileLog[]>([]);

  // --- Picks State ---
  const [isPicksDragging, setIsPicksDragging] = useState(false);
  const [picksMsg, setPicksMsg] = useState("Drag & Drop MD/TXT Files");
  const [picksFile, setPicksFile] = useState<string | null>(null);
  const [isPicksProcessing, setIsPicksProcessing] = useState(false);

  // --- Summary State ---
  const [isSumDragging, setIsSumDragging] = useState(false);
  const [sumMsg, setSumMsg] = useState("Drag & Drop Summary MD");
  const [isSumProcessing, setIsSumProcessing] = useState(false);

  // Helper to strip markdown code blocks if the AI adds them
  const stripCodeFences = (text: string) => {
      return text.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
  };

  // --- AUTH CHECK ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- SYSTEM HEALTH CHECK ---
  useEffect(() => {
      const checkHealth = async () => {
          // 1. Check DB
          try {
              const { error } = await supabase.from('weeks').select('count', { count: 'exact', head: true });
              if (error) throw error;
              setDbStatus('connected');
          } catch (e) {
              console.error("DB Check Failed:", e);
              setDbStatus('error');
          }

          // 2. Check Storage
          try {
              const { data, error } = await supabase.storage.listBuckets();
              if (error) throw error;
              const reportBucket = data.find(b => b.name === 'reports');
              if (reportBucket) setStorageStatus('connected');
              else throw new Error("Bucket 'reports' not found");
          } catch (e) {
              console.error("Storage Check Failed:", e);
              setStorageStatus('error');
          }
      };
      
      if (session) checkHealth();
  }, [session]);


  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    
    if (isSignUp) {
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) setAuthError(error.message);
        else setAuthError("Account created! Please check email to confirm (if enabled), or login.");
    } else {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) setAuthError(error.message);
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
  };

  // --- Code Generation Helpers ---
  const copyToClipboard = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopyFeedback(id);
      setTimeout(() => setCopyFeedback(null), 2000);
  };

  const generatePythonScript = () => {
      return `import asyncio
import os
import json
from crawl4ai import AsyncWebCrawler
from crawl4ai.extraction_strategy import LLMExtractionStrategy
from supabase import create_client, Client

# --- CONFIGURATION ---
SUPABASE_URL = "${SUPABASE_URL}"
SUPABASE_KEY = "${SUPABASE_ANON_KEY}"
OPENAI_KEY = "${openAIKey || 'YOUR_OPENAI_KEY_HERE'}"
TARGET_URL = "${targetSite}"

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def main():
    print(f"🚀 Starting Quantum Scanner on {TARGET_URL}...")
    
    # 1. Define Extraction Strategy (OpenAI GPT-4o)
    # This instructs the AI to look for player props in ANY HTML structure
    strategy = LLMExtractionStrategy(
        provider="openai/gpt-4o",
        api_token=OPENAI_KEY,
        instruction="""
        Extract NFL player props from the page. 
        For each prop, return a JSON object with:
        - player: string (Full Name)
        - stat: string (e.g. Passing Yards, Rush TDs)
        - line: number (The over/under number, e.g. 250.5)
        - side: string (OVER or UNDER)
        - book_odds: integer (The american odds, e.g. -115. If decimal, convert to american)
        
        Return a list of these objects.
        """
    )

    # 2. Run Crawler
    async with AsyncWebCrawler(verbose=True) as crawler:
        result = await crawler.arun(
            url=TARGET_URL,
            extraction_strategy=strategy,
            word_count_threshold=10,
            bypass_cache=True
        )
        
        if result.success:
            print("✅ Crawl Complete. Processing Data...")
            raw_data = json.loads(result.extracted_content)
            
            # 3. Process & Calculate EV
            scans = []
            for item in raw_data:
                try:
                    book_odds = int(item.get('book_odds', -110))
                    
                    # Calculate Win Probability (Sharp Book)
                    implied_prob = 0
                    if book_odds < 0:
                        implied_prob = abs(book_odds) / (abs(book_odds) + 100)
                    else:
                        implied_prob = 100 / (book_odds + 100)
                        
                    # Calculate EV against PrizePicks Fixed (-119 implies ~54.3% break even)
                    # Profit on PrizePicks is roughly 0.84 per unit (5/6 Flex) -> Dec 1.84
                    # EV = (WinProb * Profit) - (LossProb * 1)
                    profit_multiplier = 0.841 
                    ev = (implied_prob * profit_multiplier) - ((1 - implied_prob) * 1)
                    
                    scans.append({
                        "player": item.get('player'),
                        "stat": item.get('stat'),
                        "line": float(item.get('line', 0)),
                        "side": item.get('side', 'OVER').upper(),
                        "book_odds": book_odds,
                        "dfs_implied": -119,
                        "ev": round(ev * 100, 2),
                        "best_platform": "SharpBook",
                        "scanned_at": "now()"
                    })
                except Exception as e:
                    continue
            
            # 4. Push to Supabase
            if scans:
                # Upsert based on Player + Stat to avoid dupes (requires unique constraint or just insert log)
                # Here we just insert log for the feed
                supabase.table('market_scans').insert(scans).execute()
                print(f"💾 Saved {len(scans)} lines to Quantum Database.")
            else:
                print("⚠️ No valid props extracted.")
        else:
            print(f"❌ Crawl Failed: {result.error_message}")

if __name__ == "__main__":
    asyncio.run(main())`;
  };

  const generateGithubAction = () => {
      return `name: Quantum Market Scanner

on:
  schedule:
    - cron: '*/5 * * * *'  # Runs every 5 minutes
  workflow_dispatch:       # Allows manual run button

jobs:
  scrape-and-sync:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout Code
      uses: actions/checkout@v3
      
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
        
    - name: Install Dependencies
      run: |
        pip install crawl4ai supabase openai playwright
        playwright install
        
    - name: Run Quantum Scanner
      env:
        # You can also use GitHub Secrets for these
        SUPABASE_URL: \${{ secrets.SUPABASE_URL }} 
        SUPABASE_KEY: \${{ secrets.SUPABASE_KEY }}
        OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
      run: python market_scanner.py`;
  };

  // --- PDF Logic ---
  const onPdfDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsPdfDragging(true); }, []);
  const onPdfDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsPdfDragging(false); }, []);

  const processSingleFile = async (file: File, ai: GoogleGenAI): Promise<{ success: boolean; message: string }> => {
    try {
        // 1. Upload PDF to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `reports/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('reports')
            .upload(fileName, file);

        if (uploadError) {
            console.error("Storage upload failed:", uploadError);
            // We continue even if upload fails, but warn the user
        }

        const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(fileName);
        const finalFileUrl = uploadError ? undefined : publicUrl;


        // 2. Process with Gemini
        const base64Data = await fileToBase64(file);
        const base64Content = base64Data.split(',')[1];
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: file.type, data: base64Content } },
                    { text: "Extract betting performance data. Return a strictly valid JSON object (no markdown formatting). Fields: week title, date, ROI, pools. Convert Units to $100 base stakes. Mark bets as SINGLE or PARLAY." }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        date: { type: Type.STRING },
                        overallRoi: { type: Type.NUMBER },
                        pools: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    netProfit: { type: Type.NUMBER },
                                    roi: { type: Type.NUMBER },
                                    bets: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                description: { type: Type.STRING },
                                                stake: { type: Type.NUMBER },
                                                units: { type: Type.NUMBER },
                                                odds: { type: Type.STRING },
                                                result: { type: Type.STRING, enum: ['WIN', 'LOSS', 'VOID', 'PENDING'] },
                                                profit: { type: Type.NUMBER },
                                                score: { type: Type.STRING },
                                                betType: { type: Type.STRING, enum: ['SINGLE', 'PARLAY'] }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (response.text) {
            let extractedData;
            try {
                extractedData = JSON.parse(response.text);
            } catch (jsonError: any) {
                return { success: false, message: "Invalid JSON format from AI" };
            }

            const titleFromFilename = file.name.replace(/\.[^/.]+$/, "");
            const newWeekData: WeekData = {
                id: `w-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: titleFromFilename, 
                date: extractedData.date || new Date().toLocaleDateString(),
                overallRoi: extractedData.overallRoi || 0,
                fileUrl: finalFileUrl, // Save the Supabase Storage URL
                pools: (extractedData.pools || []).map((pool: any, pIdx: number) => ({
                    id: `p-${Date.now()}-${pIdx}`,
                    name: pool.name || "Pool",
                    netProfit: pool.netProfit || 0,
                    roi: pool.roi || 0,
                    bets: (pool.bets || []).map((bet: any, bIdx: number) => {
                        const rawUnits = bet.units || 0;
                        const finalStake = (bet.stake && bet.stake > 10) ? bet.stake : (rawUnits * 100);
                        return {
                            id: `b-${Date.now()}-${pIdx}-${bIdx}`,
                            description: bet.description || "Bet",
                            stake: finalStake,
                            units: rawUnits,
                            odds: bet.odds,
                            result: (bet.result as BetResult) || BetResult.PENDING,
                            profit: bet.profit || 0,
                            score: bet.score,
                            betType: (bet.betType as BetType) || 'SINGLE'
                        };
                    })
                }))
            };
            onDataUploaded(newWeekData);
            return { success: true, message: "Processed & Uploaded" };
        }
        return { success: false, message: "Empty response from AI" };
    } catch (error: any) { 
        console.error(`Error processing file ${file.name}:`, error);
        let msg = error.message || "Unknown error";
        if (msg.includes('new buckets')) msg = "Bucket 'reports' missing. Run SQL.";
        return { success: false, message: msg }; 
    }
  };

  const handlePdfFiles = useCallback(async (files: File[]) => {
      const validFiles = files.filter(f => f.type === 'application/pdf' || f.type.startsWith('image/'));
      if (validFiles.length > 0) {
        setIsPdfProcessing(true);
        setProcessingLogs(validFiles.map(f => ({ name: f.name, status: 'pending' })));
        setPdfMsg("Uploading & Processing...");

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 0; i < validFiles.length; i++) {
            const currentFile = validFiles[i];
            
            // Mark current as processing
            setProcessingLogs(prev => prev.map(log => log.name === currentFile.name ? { ...log, status: 'processing' } : log));
            
            // Process File
            const result = await processSingleFile(currentFile, ai);
            
            if (result.success) {
                successCount++;
                setProcessingLogs(prev => prev.map(log => log.name === currentFile.name ? { ...log, status: 'success', message: 'Uploaded' } : log));
            } else {
                failCount++;
                console.error(`PDF Processing Failed [${currentFile.name}]: ${result.message}`);
                setProcessingLogs(prev => prev.map(log => log.name === currentFile.name ? { ...log, status: 'error', message: result.message } : log));
            }
        }
        
        setIsPdfProcessing(false);
        
        // Granular Summary
        if (failCount === 0) {
            setPdfMsg(`Success! All ${successCount} files uploaded.`);
        } else {
            setPdfMsg(`Batch Done: ${successCount} Success, ${failCount} Failed.`);
        }
        
        // Clear logic after delay
        setTimeout(() => { 
            setProcessingLogs([]); 
            setPdfMsg("Drag & Drop PDF Reports"); 
        }, 5000);

      } else if (files.length > 0) {
         setPdfMsg("Invalid file type. PDF/Images only.");
         setTimeout(() => setPdfMsg("Drag & Drop PDF Reports"), 3000);
      }
  }, [onDataUploaded]);

  const onPdfDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsPdfDragging(false); if (e.dataTransfer.files.length > 0) handlePdfFiles(Array.from(e.dataTransfer.files)); }, [handlePdfFiles]);
  const onPdfManual = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.length) handlePdfFiles(Array.from(e.target.files)); };

  // --- Picks Logic ---
  const onPicksDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsPicksDragging(true); }, []);
  const onPicksDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsPicksDragging(false); }, []);

  const handlePicksFiles = useCallback(async (files: File[]) => {
      const file = files[0];
      if (file && (file.name.endsWith('.md') || file.name.endsWith('.txt'))) {
          setIsPicksProcessing(true);
          setPicksMsg("AI Formatting in progress...");
          setPicksFile(file.name);
          try {
             const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
             const base64Data = await fileToBase64(file);
             const base64Content = base64Data.split(',')[1];
             const mimeType = file.type || 'text/plain';

             const response = await ai.models.generateContent({
                 model: 'gemini-2.5-flash',
                 contents: {
                     parts: [
                         { inlineData: { mimeType: mimeType, data: base64Content } },
                         { text: "Convert these betting notes into a High-Frequency Trading style report. Structure MUST include: 1. An 'Executive Summary' paragraph at the top. 2. Distinct 'Market Analysis' sections with paragraphs explaining the edge. 3. 'Official Plays' in bullet points. Use H1 (#) for Title, H2 (##) for Sections. Do not use code blocks. Return raw formatted text only." }
                     ]
                 }
             });

             if (response.text) {
                 const cleanText = stripCodeFences(response.text);
                 onUpdatePicks(cleanText, file.name.replace(/\.[^/.]+$/, ""));
                 setPicksMsg("Picks Updated & Archived!");
             }
          } catch (error) {
              console.error("Picks processing error:", error);
              setPicksMsg("Error processing file.");
          } finally {
              setIsPicksProcessing(false);
              setTimeout(() => setPicksMsg("Drag & Drop MD/TXT Files"), 3000);
          }
      } else {
          setPicksMsg("Invalid file type. MD/TXT only.");
          setTimeout(() => setPicksMsg("Drag & Drop MD/TXT Files"), 3000);
      }
      setIsPicksDragging(false);
  }, [onUpdatePicks]);

  const onPicksDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsPicksDragging(false); if (e.dataTransfer.files.length > 0) handlePicksFiles(Array.from(e.dataTransfer.files)); }, [handlePicksFiles]);
  const onPicksManual = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.length) handlePicksFiles(Array.from(e.target.files)); };

  // --- Summary Logic ---
  const onSumDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsSumDragging(true); }, []);
  const onSumDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsSumDragging(false); }, []);

  const handleSummaryFiles = useCallback(async (files: File[]) => {
      const file = files[0];
      if (file && (file.name.endsWith('.md') || file.name.endsWith('.txt'))) {
          setIsSumProcessing(true);
          setSumMsg("Processing Summary...");
          try {
             const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
             const base64Data = await fileToBase64(file);
             const base64Content = base64Data.split(',')[1];
             const mimeType = file.type || 'text/plain';

             const response = await ai.models.generateContent({
                 model: 'gemini-2.5-flash',
                 contents: {
                     parts: [
                         { inlineData: { mimeType: mimeType, data: base64Content } },
                         { text: "Format this text as a 'Game Summary'. Return a strict JSON object: { title: string, date: string, content: string }. Ensure the 'content' field is raw text with headers/bullets, but NOT wrapped in code fences." }
                     ]
                 },
                 config: { responseMimeType: "application/json" }
             });

             if (response.text) {
                 const data = JSON.parse(response.text);
                 const summary: GameSummary = {
                     id: `sum-${Date.now()}`,
                     title: data.title || file.name.replace(/\.[^/.]+$/, ""),
                     date: data.date || new Date().toLocaleDateString(),
                     content: stripCodeFences(data.content || "")
                 };
                 onUploadSummary(summary);
                 setSumMsg("Summary Added to DB!");
             }
          } catch (error) {
              console.error("Summary processing error:", error);
              setSumMsg("Error processing file.");
          } finally {
              setIsSumProcessing(false);
              setTimeout(() => setSumMsg("Drag & Drop Summary MD"), 3000);
          }
      } else {
        setSumMsg("Invalid file type. MD/TXT only.");
        setTimeout(() => setSumMsg("Drag & Drop Summary MD"), 3000);
      }
      setIsSumDragging(false);
  }, [onUploadSummary]);
  const onSumDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsSumDragging(false); if (e.dataTransfer.files.length > 0) handleSummaryFiles(Array.from(e.dataTransfer.files)); }, [handleSummaryFiles]);
  const onSumManual = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.length) handleSummaryFiles(Array.from(e.target.files)); };


  // --- Access Denied View (Supabase Login) ---
  if (!session) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
              <div className="glass-panel p-8 rounded-2xl border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.1)] max-w-md w-full text-center">
                  <div className="bg-rose-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/30">
                      <Lock size={40} className="text-rose-500" />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-widest">
                      {isSignUp ? 'Create Admin Account' : 'Restricted Access'}
                  </h2>
                  <p className="text-rose-400/80 text-sm mb-6">Supabase Auth Required</p>
                  
                  <form onSubmit={handleAuth} className="space-y-4">
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Admin Email"
                        className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-all"
                        required
                      />
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-rose-500 focus:outline-none transition-all"
                        required
                      />
                      {authError && <p className="text-rose-500 text-xs font-bold animate-pulse">{authError}</p>}
                      <button 
                        type="submit"
                        disabled={authLoading}
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-lg uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)] disabled:opacity-50 flex justify-center items-center gap-2"
                      >
                          {authLoading ? <Loader2 className="animate-spin" size={16} /> : (isSignUp ? 'Sign Up' : 'Login')}
                      </button>
                  </form>
                  
                  <div className="mt-4 pt-4 border-t border-slate-800">
                      <button 
                        onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }}
                        className="text-xs text-slate-500 hover:text-cyan-400 transition-colors flex items-center justify-center gap-1 mx-auto"
                      >
                          {isSignUp ? <LogOut size={12}/> : <UserPlus size={12}/>}
                          {isSignUp ? 'Back to Login' : 'Register New Admin'}
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- Authorization Check (Whitelist) ---
  if (session.user.email !== AUTHORIZED_ADMIN) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
              <div className="glass-panel p-8 rounded-2xl border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.1)] max-w-md w-full text-center">
                  <div className="bg-rose-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/30">
                      <ShieldAlert size={40} className="text-rose-500" />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-widest">Unauthorized</h2>
                  <p className="text-rose-400/80 text-sm mb-6">
                      User <strong>{session.user.email}</strong> is not authorized to access the Admin Console.
                  </p>
                  <button 
                    onClick={handleLogout}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg uppercase tracking-widest transition-all"
                  >
                      Logout
                  </button>
              </div>
          </div>
      );
  }

  // --- Authenticated View ---
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center mb-12">
            <div>
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-600">
                    ADMIN CONSOLE
                </h1>
                <p className="text-slate-400">System Management & Data Ingestion (Supabase Connected)</p>
            </div>
            <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-3">
                    <span className="text-xs text-emerald-500 font-mono hidden md:block">{session.user.email}</span>
                    <button 
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-rose-500 transition-all text-xs font-bold uppercase"
                    >
                        <LogOut size={14} /> Logout
                    </button>
                </div>
                
                {/* System Health Check */}
                <div className="flex items-center gap-4 text-[10px] font-mono bg-black/40 px-3 py-1.5 rounded-full border border-slate-800">
                    <div className="flex items-center gap-1.5">
                        <Database size={10} className={dbStatus === 'connected' ? "text-emerald-400" : "text-rose-400"} />
                        <span className={dbStatus === 'connected' ? "text-emerald-400" : "text-rose-400"}>
                            DB: {dbStatus === 'checking' ? '...' : dbStatus === 'connected' ? 'OK' : 'ERR'}
                        </span>
                    </div>
                    <div className="w-px h-3 bg-slate-700"></div>
                    <div className="flex items-center gap-1.5">
                        <HardDrive size={10} className={storageStatus === 'connected' ? "text-emerald-400" : "text-rose-400"} />
                        <span className={storageStatus === 'connected' ? "text-emerald-400" : "text-rose-400"}>
                            Bucket: {storageStatus === 'checking' ? '...' : storageStatus === 'connected' ? 'OK' : 'ERR'}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-8">
            <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-800 flex gap-1">
                <button
                    onClick={() => setActiveTab('manual')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'manual' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white'}`}
                >
                    <UploadCloud size={16} /> Manual Upload
                </button>
                <button
                    onClick={() => setActiveTab('automation')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${activeTab === 'automation' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-white'}`}
                >
                    <Cpu size={16} /> Automation
                </button>
            </div>
        </div>

        {activeTab === 'manual' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 animate-in fade-in zoom-in duration-300">
                {/* 1. PDF Uploader */}
                <div className="glass-panel p-1 rounded-2xl border border-cyan-500/30">
                    <div className="bg-slate-900/80 p-6 rounded-xl h-full flex flex-col">
                        <h3 className="text-xl font-bold text-cyan-400 mb-6 flex items-center gap-2">
                            <FileUp size={20} /> Result Ingestion
                        </h3>
                        <div 
                            className={`flex-grow border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all ${
                                isPdfDragging ? 'border-cyan-400 bg-cyan-400/10' : 'border-slate-700 bg-black/20 hover:border-cyan-500/50'
                            }`}
                            onDragOver={onPdfDragOver}
                            onDragLeave={onPdfDragLeave}
                            onDrop={onPdfDrop}
                        >
                            {processingLogs.length === 0 ? (
                                <>
                                    <div className={`p-4 rounded-full bg-slate-800 mb-4 ${isPdfDragging ? 'animate-bounce' : ''}`}>
                                        {isPdfProcessing ? <Loader2 className="animate-spin text-cyan-400" size={32}/> : <UploadCloud className="text-cyan-400" size={32}/>}
                                    </div>
                                    <h4 className="text-white font-bold mb-2">{pdfMsg}</h4>
                                    <label className="cursor-pointer text-xs text-cyan-400 font-bold uppercase tracking-wider hover:text-cyan-300">
                                        Browse Files
                                        <input type="file" hidden multiple accept=".pdf,image/*" onChange={onPdfManual} />
                                    </label>
                                </>
                            ) : (
                                <div className="w-full max-h-[250px] overflow-y-auto pr-2">
                                    <h4 className="text-white font-bold mb-4 border-b border-slate-700 pb-2">Processing Batch...</h4>
                                    <div className="space-y-3">
                                        {processingLogs.map((log, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-slate-900/50 p-2 rounded border border-slate-800 text-xs">
                                                <div className="flex items-center gap-2 truncate">
                                                    {log.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-slate-600"></div>}
                                                    {log.status === 'processing' && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
                                                    {log.status === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
                                                    {log.status === 'error' && <X className="w-4 h-4 text-rose-500" />}
                                                    <span className={`${log.status === 'error' ? 'text-rose-400' : 'text-slate-300'}`}>{log.name}</span>
                                                </div>
                                                {log.status === 'error' && (
                                                    <div className="text-rose-500 text-[10px] ml-2 flex items-center gap-1 shrink-0 max-w-[50%] justify-end" title={log.message}>
                                                        <AlertCircle size={10} className="shrink-0" />
                                                        <span className="truncate">{log.message}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {!isPdfProcessing && (
                                        <button 
                                            onClick={() => { setProcessingLogs([]); setPdfMsg("Drag & Drop PDF Reports"); }}
                                            className="mt-4 text-xs text-cyan-400 hover:text-white underline"
                                        >
                                            Start New Upload
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Picks Uploader */}
                <div className="glass-panel p-1 rounded-2xl border border-emerald-500/30">
                    <div className="bg-slate-900/80 p-6 rounded-xl h-full flex flex-col">
                        <h3 className="text-xl font-bold text-emerald-400 mb-6 flex items-center gap-2">
                            <Edit3 size={20} /> Daily Picks Update
                        </h3>
                        <div 
                            className={`flex-grow border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all ${
                                isPicksDragging ? 'border-emerald-400 bg-emerald-400/10' : 'border-slate-700 bg-black/20 hover:border-emerald-500/50'
                            }`}
                            onDragOver={onPicksDragOver}
                            onDragLeave={onPicksDragLeave}
                            onDrop={onPicksDrop}
                        >
                            <div className={`p-4 rounded-full bg-slate-800 mb-4 ${isPicksDragging ? 'animate-bounce' : ''}`}>
                                {isPicksProcessing ? <Loader2 className="animate-spin text-emerald-400" size={32}/> : (picksFile ? <Check className="text-emerald-400" size={32}/> : <FileText className="text-emerald-400" size={32}/>)}
                            </div>
                            <h4 className="text-white font-bold mb-2">{picksMsg}</h4>
                            <p className="text-[10px] text-slate-500 mb-4 uppercase">Auto-archives previous picks</p>
                            <label className="cursor-pointer text-xs text-emerald-400 font-bold uppercase tracking-wider hover:text-emerald-300">
                                Browse .MD Files
                                <input type="file" hidden accept=".md,.txt" onChange={onPicksManual} />
                            </label>
                        </div>
                    </div>
                </div>

                {/* 3. Game Summary Uploader */}
                <div className="glass-panel p-1 rounded-2xl border border-amber-500/30">
                    <div className="bg-slate-900/80 p-6 rounded-xl h-full flex flex-col">
                        <h3 className="text-xl font-bold text-amber-400 mb-6 flex items-center gap-2">
                            <BookOpen size={20} /> Game Summaries
                        </h3>
                        <div 
                            className={`flex-grow border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all ${
                                isSumDragging ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700 bg-black/20 hover:border-amber-500/50'
                            }`}
                            onDragOver={onSumDragOver}
                            onDragLeave={onSumDragLeave}
                            onDrop={onSumDrop}
                        >
                            <div className={`p-4 rounded-full bg-slate-800 mb-4 ${isSumDragging ? 'animate-bounce' : ''}`}>
                                {isSumProcessing ? <Loader2 className="animate-spin text-amber-400" size={32}/> : <FileText className="text-amber-400" size={32}/>}
                            </div>
                            <h4 className="text-white font-bold mb-2">{sumMsg}</h4>
                            <p className="text-[10px] text-slate-500 mb-4 uppercase">Adds to Sunday Summary DB</p>
                            <label className="cursor-pointer text-xs text-amber-400 font-bold uppercase tracking-wider hover:text-amber-300">
                                Browse .MD Files
                                <input type="file" hidden accept=".md,.txt" onChange={onSumManual} />
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="glass-panel rounded-2xl p-6 border border-purple-500/30 mb-12 animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-start mb-8 border-b border-slate-700 pb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
                             <Cpu className="text-purple-400" /> Automation Command Center
                        </h2>
                        <p className="text-slate-400 text-xs mt-1">Configure automated odds scraping and GitHub Actions scheduling.</p>
                    </div>
                    <div className="bg-purple-900/20 px-3 py-1 rounded border border-purple-500/30 text-[10px] text-purple-300 font-mono">
                        Powered by Crawl4AI + Supabase
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Step 1: Config */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-black/40 p-5 rounded-xl border border-slate-700 shadow-xl">
                            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Key size={16} /> 1. Configuration
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">OpenAI API Key (Required for Extraction)</label>
                                    <input 
                                        type="password" 
                                        value={openAIKey}
                                        onChange={(e) => setOpenAIKey(e.target.value)}
                                        placeholder="sk-..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                                    />
                                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-[9px] text-emerald-500 hover:underline flex items-center gap-1 mt-1">
                                        Get Key Here <Globe size={9}/>
                                    </a>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Target Scraping Site</label>
                                    <input 
                                        type="text" 
                                        value={targetSite}
                                        onChange={(e) => setTargetSite(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                                    />
                                    <div className="text-[9px] text-slate-500 mt-2">
                                        Recommended: <br/>
                                        - https://www.bettingpros.com/nfl/props/ <br/>
                                        - https://sportsbook.draftkings.com/leagues/football/nfl
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-black/40 p-5 rounded-xl border border-slate-700 shadow-xl">
                            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Clock size={16} /> 3. Schedule (GitHub)
                            </h3>
                            <p className="text-[10px] text-slate-400 mb-4">
                                This YAML file configures GitHub Actions to run the script every 5 minutes for free.
                            </p>
                            <div className="relative">
                                <div className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-[9px] text-cyan-300 overflow-x-auto whitespace-pre h-40 custom-scrollbar">
                                    {generateGithubAction()}
                                </div>
                                <button 
                                    onClick={() => copyToClipboard(generateGithubAction(), 'yaml')}
                                    className="absolute top-2 right-2 p-1.5 bg-cyan-900/50 hover:bg-cyan-600 rounded text-white transition-colors"
                                >
                                    {copyFeedback === 'yaml' ? <Check size={12}/> : <Copy size={12}/>}
                                </button>
                            </div>
                            <div className="mt-2 text-[9px] text-slate-500">
                                Save as: <span className="font-mono text-white">.github/workflows/market_scanner.yml</span>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Code Output */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900 rounded-xl border border-slate-700 h-full flex flex-col shadow-xl">
                            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-black/40 rounded-t-xl">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <Terminal size={16} className="text-purple-400" /> 2. The Engine (Python)
                                </h3>
                                <button 
                                    onClick={() => copyToClipboard(generatePythonScript(), 'py')}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold uppercase transition-colors"
                                >
                                    {copyFeedback === 'py' ? <Check size={14}/> : <Copy size={14}/>}
                                    Copy Script
                                </button>
                            </div>
                            <div className="flex-grow relative">
                                <textarea
                                    readOnly
                                    value={generatePythonScript()}
                                    className="w-full h-full bg-[#0a0a0a] p-4 font-mono text-xs text-emerald-400 focus:outline-none resize-none custom-scrollbar"
                                />
                            </div>
                            <div className="p-3 bg-black/40 border-t border-slate-700 rounded-b-xl text-[10px] text-slate-500 flex justify-between">
                                <span>Save as: <strong className="text-white">market_scanner.py</strong></span>
                                <span>Dependencies: <code className="bg-slate-800 px-1 rounded text-slate-300">pip install crawl4ai supabase openai</code></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Data Management Table */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-700">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <AlertTriangle size={20} className="text-amber-500" /> System Data Management
                </h3>
                <button 
                    onClick={onFactoryReset}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-900/30 border border-rose-800/50 rounded-lg text-rose-400 hover:bg-rose-900/50 hover:text-rose-300 transition-all text-xs font-bold uppercase"
                >
                    <Database size={14} /> Factory Reset (Clear DB)
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-xs uppercase text-slate-500 border-b border-slate-700">
                            <th className="py-3 px-4">Report ID</th>
                            <th className="py-3 px-4">Title</th>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {weeks.map(week => (
                            <tr key={week.id} className="border-b border-slate-800/50 hover:bg-white/5 transition-colors">
                                <td className="py-3 px-4 font-mono text-xs text-slate-500">{week.id}</td>
                                <td className="py-3 px-4 text-white font-bold">{week.title}</td>
                                <td className="py-3 px-4 text-slate-400">{week.date}</td>
                                <td className="py-3 px-4 text-right">
                                    <button 
                                        onClick={() => onDeleteReport(week.id)}
                                        className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 p-2 rounded transition-all"
                                        title="Delete Permanently"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};
