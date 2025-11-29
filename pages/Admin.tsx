
import React, { useState, useCallback } from 'react';
import { FileUp, Edit3, Lock, Unlock, UploadCloud, Check, Loader2, Trash2, AlertTriangle, FileText, X, AlertCircle } from 'lucide-react';
import { WeekData, BetResult, BetType } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { ADMIN_PASSWORD } from '../constants';

interface AdminProps {
  onDataUploaded: (data: WeekData) => void;
  weeks: WeekData[];
  onDeleteReport: (id: string) => void;
  onUpdatePicks: (content: string, filename: string) => void;
}

interface FileLog {
  name: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  message?: string;
}

export const Admin: React.FC<AdminProps> = ({ onDataUploaded, weeks, onDeleteReport, onUpdatePicks }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // PDF State
  const [isPdfDragging, setIsPdfDragging] = useState(false);
  const [pdfMsg, setPdfMsg] = useState("Drag & Drop PDF Reports");
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);
  const [processingLogs, setProcessingLogs] = useState<FileLog[]>([]);

  // Picks State
  const [isPicksDragging, setIsPicksDragging] = useState(false);
  const [picksMsg, setPicksMsg] = useState("Drag & Drop MD/TXT Files");
  const [picksFile, setPicksFile] = useState<string | null>(null);
  const [isPicksProcessing, setIsPicksProcessing] = useState(false);

  // Auth Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
        setIsAuthenticated(true);
        setErrorMsg('');
    } else {
        setErrorMsg('Access Denied: Invalid Credentials');
        setPasswordInput('');
    }
  };

  // --- PDF Logic ---
  const onPdfDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsPdfDragging(true); }, []);
  const onPdfDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsPdfDragging(false); }, []);
  
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
  };

  const processSingleFile = async (file: File, ai: GoogleGenAI): Promise<{ success: boolean; message: string }> => {
    try {
        const base64Data = await fileToBase64(file);
        const base64Content = base64Data.split(',')[1];
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: file.type, data: base64Content } },
                    { text: "Extract betting performance data. Return JSON with week title, date, ROI, pools. Convert Units to $100 base stakes. Mark bets as SINGLE or PARLAY." }
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
            return { success: true, message: "Processed successfully" };
        }
        return { success: false, message: "Empty response from AI" };
    } catch (error: any) { 
        console.error(`Error processing file ${file.name}:`, error);
        let msg = error.message || "Unknown error";
        
        // Make errors more user friendly
        if (msg.includes("429")) msg = "API Quota Exceeded (429)";
        else if (msg.includes("500") || msg.includes("503")) msg = "AI Service Error (500)";
        else if (msg.includes("fetch")) msg = "Network Connection Failed";
        
        return { success: false, message: msg }; 
    }
  };

  const handlePdfFiles = useCallback(async (files: File[]) => {
      const validFiles = files.filter(f => f.type === 'application/pdf' || f.type.startsWith('image/'));
      
      if (validFiles.length > 0) {
        setIsPdfProcessing(true);
        
        // Initialize Logs
        const initialLogs: FileLog[] = validFiles.map(f => ({
            name: f.name,
            status: 'pending'
        }));
        setProcessingLogs(initialLogs);
        setPdfMsg("Processing Batch...");

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let processedCount = 0;
        
        for (let i = 0; i < validFiles.length; i++) {
            const currentFile = validFiles[i];
            
            // Update Log to Processing
            setProcessingLogs(prev => prev.map(log => 
                log.name === currentFile.name ? { ...log, status: 'processing' } : log
            ));

            const result = await processSingleFile(currentFile, ai);
            
            // Update Log with Result
            setProcessingLogs(prev => prev.map(log => 
                log.name === currentFile.name 
                    ? { ...log, status: result.success ? 'success' : 'error', message: result.message } 
                    : log
            ));

            if (result.success) processedCount++;
        }
        
        setIsPdfProcessing(false);
        setPdfMsg(processedCount === validFiles.length ? "All Files Processed" : "Batch Complete with Errors");
        
        // Clear logs after a delay if all successful, otherwise keep them for inspection
        if (processedCount === validFiles.length) {
             setTimeout(() => {
                 setProcessingLogs([]);
                 setPdfMsg("Drag & Drop PDF Reports");
             }, 4000);
        }
      } else if (files.length > 0) {
         setPdfMsg("Invalid file type. PDF/Images only.");
         setTimeout(() => setPdfMsg("Drag & Drop PDF Reports"), 3000);
      }
  }, [onDataUploaded]);

  const onPdfDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsPdfDragging(false);
    if (e.dataTransfer.files.length > 0) handlePdfFiles(Array.from(e.dataTransfer.files));
  }, [handlePdfFiles]);

  const onPdfManual = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handlePdfFiles(Array.from(e.target.files));
  };

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
             // Fallback mimeType if browser doesn't detect .md type correctly
             const mimeType = file.type || 'text/plain';

             const response = await ai.models.generateContent({
                 model: 'gemini-2.5-flash',
                 contents: {
                     parts: [
                         { inlineData: { mimeType: mimeType, data: base64Content } },
                         { text: "Convert this betting notes text into a clean Markdown format suitable for a picks display. Use '# HEADER' for main sections (like 'WEEK 6 SLATE' or 'KEY POSITIONS'), '## Subheader' for specific matchups or game blocks, and bold '**text**' for team names, spreads, and odds. Create an 'EXECUTIVE SUMMARY' section at the top if one doesn't exist. Ensure the layout is readable and professional. Return raw markdown." }
                     ]
                 }
             });

             if (response.text) {
                 onUpdatePicks(response.text, file.name.replace(/\.[^/.]+$/, ""));
                 setPicksMsg("Picks Updated & Archived!");
             } else {
                 throw new Error("No response text from AI");
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

  const onPicksDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault(); setIsPicksDragging(false);
      if (e.dataTransfer.files.length > 0) handlePicksFiles(Array.from(e.dataTransfer.files));
  }, [handlePicksFiles]);

  const onPicksManual = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) handlePicksFiles(Array.from(e.target.files));
  };


  // --- Access Denied View ---
  if (!isAuthenticated) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
              <div className="glass-panel p-8 rounded-2xl border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.1)] max-w-md w-full text-center">
                  <div className="bg-rose-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/30">
                      <Lock size={40} className="text-rose-500" />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-widest">Restricted Access</h2>
                  <p className="text-rose-400/80 text-sm mb-6">Authorized Personnel Only</p>
                  
                  <form onSubmit={handleLogin} className="space-y-4">
                      <input 
                        type="password" 
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Enter Passkey"
                        className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-3 text-center text-white focus:border-rose-500 focus:outline-none focus:shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all tracking-widest"
                      />
                      {errorMsg && <p className="text-rose-500 text-xs font-bold animate-pulse">{errorMsg}</p>}
                      <button 
                        type="submit"
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-lg uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                      >
                          Authenticate
                      </button>
                  </form>
              </div>
          </div>
      );
  }

  // --- Authenticated View ---
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center mb-12">
            <div>
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-600">
                    ADMIN CONSOLE
                </h1>
                <p className="text-slate-400">System Management & Data Ingestion</p>
            </div>
            <button 
                onClick={() => setIsAuthenticated(false)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-rose-500 transition-all text-xs font-bold uppercase"
            >
                <Lock size={14} /> Lock System
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* PDF Uploader */}
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

            {/* Picks Uploader */}
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
                        <p className="text-[10px] text-slate-500 mb-4 uppercase">Auto-archives previous picks on upload</p>
                        <label className="cursor-pointer text-xs text-emerald-400 font-bold uppercase tracking-wider hover:text-emerald-300">
                            Browse .MD Files
                            <input type="file" hidden accept=".md,.txt" onChange={onPicksManual} />
                        </label>
                    </div>
                </div>
            </div>
        </div>

        {/* Data Management */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <AlertTriangle size={20} className="text-amber-500" /> System Data Management
            </h3>
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
