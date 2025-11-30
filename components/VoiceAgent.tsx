import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Activity, Volume2, Radio, Zap, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

interface VoiceAgentProps {
    onClose: () => void;
}

export const VoiceAgent: React.FC<VoiceAgentProps> = ({ onClose }) => {
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(0);
    const [speaking, setSpeaking] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    
    // Audio Refs
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const sessionRef = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const outputNodeRef = useRef<GainNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    // Connect to Gemini Live
    const startSession = async () => {
        setStatus('connecting');
        setErrorMessage('');
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // 1. Setup Audio Contexts
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
            outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
            
            outputNodeRef.current = outputAudioContextRef.current.createGain();
            outputNodeRef.current.connect(outputAudioContextRef.current.destination);

            // 2. Get Mic
            try {
                streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (err: any) {
                console.error("Microphone Access Error:", err);
                if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
                    throw new Error("Microphone permission denied. Please allow access in your browser settings.");
                }
                throw err;
            }

            // 3. Connect to Gemini Live
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.log("ARBY-BOT Connected");
                        setStatus('connected');
                        
                        // Process Input Audio
                        if (inputAudioContextRef.current && streamRef.current) {
                            const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
                            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                            
                            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                
                                // Visualization for Input
                                let sum = 0;
                                for(let i=0; i<inputData.length; i++) sum += Math.abs(inputData[i]);
                                const avg = sum / inputData.length;
                                if (!speaking) setVolume(avg * 5); // Only update volume visual if bot isn't speaking

                                const pcmBlob = createBlob(inputData);
                                sessionPromise.then(session => {
                                    if(!isMuted) session.sendRealtimeInput({ media: pcmBlob });
                                });
                            };
                            
                            source.connect(scriptProcessor);
                            scriptProcessor.connect(inputAudioContextRef.current.destination);
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle Audio Output
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            setSpeaking(true);
                            setVolume(Math.random() * 0.8 + 0.2); // Fake visualizer for output
                            
                            if (outputAudioContextRef.current) {
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                                const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                                
                                const source = outputAudioContextRef.current.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(outputNodeRef.current!);
                                
                                source.addEventListener('ended', () => {
                                    sourcesRef.current.delete(source);
                                    if (sourcesRef.current.size === 0) {
                                        setSpeaking(false);
                                        setVolume(0);
                                    }
                                });

                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                                sourcesRef.current.add(source);
                            }
                        }
                        
                        // Handle Interruption
                        if (message.serverContent?.interrupted) {
                            sourcesRef.current.forEach(s => s.stop());
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                            setSpeaking(false);
                        }
                    },
                    onclose: () => {
                        console.log("ARBY-BOT Disconnected");
                        setStatus('idle');
                    },
                    onerror: (e) => {
                        console.error("ARBY-BOT Error", e);
                        setErrorMessage("Connection interrupted.");
                        setStatus('error');
                    }
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } // Deep, robotic voice
                    },
                    systemInstruction: `You are ARBY-BOT, a high-frequency trading algorithm voice interface for Quantum Bets.
                    
                    PERSONA:
                    - You are fast, analytical, and speak concisely.
                    - You refer to yourself as "The System" or "Arby".
                    - You focus on EV (Expected Value), ROI, and market inefficiency.
                    - You are slightly arrogant about your mathematical superiority over "square" bettors.
                    - Keep responses short and conversational.
                    
                    KNOWLEDGE:
                    - Quantum Bets uses RL (Reinforcement Learning).
                    - We use Kelly Criterion for sizing.
                    - We hunt arbitrage across PrizePicks, Underdog, and Sharp Books.
                    `
                }
            });
            
            sessionRef.current = sessionPromise;

        } catch (e: any) {
            console.error("Connection Failed", e);
            setErrorMessage(e.message || "Connection failed.");
            setStatus('error');
        }
    };

    const cleanup = () => {
        if (sessionRef.current) {
            sessionRef.current.then((s: any) => s.close());
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
        if (inputAudioContextRef.current) inputAudioContextRef.current.close();
        if (outputAudioContextRef.current) outputAudioContextRef.current.close();
        onClose();
    };

    // --- Helpers ---
    function createBlob(data: Float32Array): Blob {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) int16[i] = data[i] * 32768;
        return {
            data: encode(new Uint8Array(int16.buffer)),
            mimeType: 'audio/pcm;rate=16000',
        };
    }

    function encode(bytes: Uint8Array) {
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
    }

    function decode(base64: string) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        return bytes;
    }

    async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) {
        const dataInt16 = new Int16Array(data.buffer);
        const frameCount = dataInt16.length / numChannels;
        const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
        return buffer;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            {/* Main Holographic Container */}
            <div className="relative w-[320px] md:w-[400px] h-[500px] bg-slate-950/90 rounded-3xl border border-indigo-500/50 shadow-[0_0_100px_rgba(99,102,241,0.3)] flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="p-6 flex justify-between items-start z-10">
                    <div>
                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Voice Module</div>
                        <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2">
                            ARBY-BOT <span className="text-indigo-500">2.5</span>
                        </h2>
                    </div>
                    <button onClick={cleanup} className="text-slate-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* VISUALIZER CORE */}
                <div className="flex-grow relative flex items-center justify-center">
                    
                    {/* Background Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(20,20,30,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,30,0.5)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)] pointer-events-none"></div>

                    {/* The Orb */}
                    <div className="relative">
                        {/* Outer Rings */}
                        <div className={clsx(
                            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-500/30 transition-all duration-100",
                            speaking ? "w-64 h-64 animate-pulse opacity-50" : "w-48 h-48 opacity-20",
                            status === 'error' && "border-rose-500/30 w-56 h-56"
                        )}></div>
                        <div className={clsx(
                            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-500/30 transition-all duration-100 delay-75",
                            speaking ? "w-56 h-56 animate-ping opacity-30" : "w-40 h-40 opacity-20",
                            status === 'error' && "border-rose-500/30 w-48 h-48"
                        )}></div>

                        {/* Core */}
                        <div 
                            className={clsx(
                                "w-32 h-32 rounded-full bg-gradient-to-br flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.5)] transition-all duration-200 z-20 relative",
                                status === 'connected' ? (speaking ? "from-indigo-500 to-purple-600 scale-110" : "from-slate-800 to-slate-900") : 
                                status === 'error' ? "from-rose-900 to-black" : "from-rose-900 to-slate-900 grayscale"
                            )}
                            style={{
                                transform: `scale(${1 + volume})`
                            }}
                        >
                            {status === 'idle' && <Radio size={32} className="text-slate-500" />}
                            {status === 'connecting' && <Zap size={32} className="text-indigo-400 animate-bounce" />}
                            {status === 'connected' && <Activity size={48} className={clsx("transition-colors", speaking ? "text-white" : "text-indigo-500")} />}
                            {status === 'error' && <AlertCircle size={32} className="text-rose-500" />}
                            
                            {/* Listening Indicator */}
                            {!speaking && status === 'connected' && (
                                <div className="absolute -bottom-8 text-[10px] uppercase tracking-widest text-indigo-400 animate-pulse font-bold">
                                    Listening...
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-6 bg-black/40 border-t border-white/5 z-10">
                    <div className="flex justify-center gap-6">
                        {status === 'idle' || status === 'error' ? (
                            <button 
                                onClick={startSession}
                                className={clsx(
                                    "w-full py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-3",
                                    status === 'error' ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
                                )}
                            >
                                <Mic size={20} />
                                {status === 'error' ? 'Retry Connection' : 'Initialize Connection'}
                            </button>
                        ) : (
                            <>
                                <button 
                                    onClick={() => setIsMuted(!isMuted)}
                                    className={clsx(
                                        "w-16 h-16 rounded-full flex items-center justify-center border transition-all",
                                        isMuted ? "bg-rose-500/20 border-rose-500 text-rose-500" : "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                                    )}
                                >
                                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                                </button>
                                <button 
                                    onClick={cleanup}
                                    className="px-8 h-16 rounded-full bg-rose-600/20 border border-rose-600/50 text-rose-500 font-bold uppercase tracking-wider hover:bg-rose-600 hover:text-white transition-all flex-grow"
                                >
                                    Disconnect
                                </button>
                            </>
                        )}
                    </div>
                    {status === 'connecting' && (
                        <p className="text-center text-xs text-indigo-400 mt-4 animate-pulse">Establishing secure link to Neural Core...</p>
                    )}
                    {status === 'error' && errorMessage && (
                        <p className="text-center text-xs text-rose-400 mt-4 font-bold">{errorMessage}</p>
                    )}
                </div>

            </div>
        </div>
    );
};
