
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Minimize2, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { clsx } from 'clsx';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Welcome to Quantum Bets. I am your RL-driven analytic assistant. Ask me about our Kelly Criterion money management or specific model mechanics.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    // Optimistically add user message
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Filter out the initial welcome message from history to ensure clean context if desired, 
      // or map all if valid. Here we map all except the very first static greeting to save context 
      // and ensure typical conversation flow (User starts usually, but we inject context).
      // We will actually just pass the conversation history as is, but exclude the static greeting 
      // if it hasn't been "sent" to the model before.
      const apiHistory = messages.slice(1).map(m => ({ 
          role: m.role, 
          parts: [{ text: m.text }] 
      }));

      const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
           systemInstruction: `You are the Quantum Bets AI Assistant, a specialized bot for a high-frequency NFL betting model. 
           
           CORE KNOWLEDGE BASE:
           1. **Reinforcement Learning (RL):** The model uses Deep Q-Networks (DQN) to analyze thousands of game simulations, identifying market inefficiencies where public perception differs from calculated probability.
           2. **Kelly Criterion Money Management:** We do NOT use flat betting. We use a fractional Kelly Criterion (typically 0.3x) optimized by the RL agent. This maximizes geometric growth while strictly minimizing risk of ruin.
              - High Edge = Larger Bet (up to 5u)
              - Lower Edge = Smaller Bet (0.5u - 1u)
           3. **Philosophy:** Eliminate emotional bias. Pure math and probability. 'Gut feelings' are noise.
           4. **Terminology:** 
              - '+EV': Positive Expected Value.
              - 'Unit (u)': Standard bet size (1% of bankroll).
              - 'CLV': Closing Line Value.

           TONE: Professional, analytical, precise, slightly futuristic/financial. Concise answers.`
        },
        history: apiHistory
      });

      const result = await chat.sendMessage({ message: userMessage });
      const responseText = result.text;

      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Connection to Quantum Core interrupted. Please verify API latency or try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all duration-300 hover:scale-110 border border-cyan-500/30",
          isOpen ? "bg-slate-900 text-slate-400 rotate-90" : "bg-cyan-500/10 backdrop-blur-md text-cyan-400 animate-pulse-slow"
        )}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} strokeWidth={2.5} />}
      </button>

      {/* Chat Window */}
      <div className={clsx(
        "fixed bottom-24 right-6 z-50 w-[90vw] md:w-[400px] h-[500px] max-h-[70vh] flex flex-col transition-all duration-500 origin-bottom-right",
        isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-0 opacity-0 translate-y-10 pointer-events-none"
      )}>
        <div className="glass-panel flex flex-col h-full rounded-2xl border border-cyan-500/30 overflow-hidden shadow-2xl bg-[#050505]/95 backdrop-blur-xl">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-900/50 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/50 flex items-center justify-center relative">
                <Sparkles size={16} className="text-cyan-400 absolute top-0 right-0 -mr-1 -mt-1 animate-pulse" />
                <Bot size={18} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 uppercase tracking-wider">Quantum AI</h3>
                <p className="text-[10px] text-cyan-400 font-mono tracking-wide">GEMINI-3-PRO // ONLINE</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded">
                <Minimize2 size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={clsx("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                <div className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                  msg.role === 'user' ? "bg-purple-500/10 border-purple-500/50 text-purple-400" : "bg-cyan-500/10 border-cyan-500/50 text-cyan-400"
                )}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={clsx(
                  "p-3 rounded-xl text-xs leading-relaxed max-w-[80%] shadow-lg backdrop-blur-sm",
                  msg.role === 'user' ? "bg-purple-900/40 text-purple-100 rounded-tr-none border border-purple-500/20" : "bg-slate-800/60 text-slate-200 rounded-tl-none border border-cyan-500/10"
                )}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
               <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/50 flex items-center justify-center shrink-0">
                      <Bot size={14} className="text-cyan-400" />
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-xl rounded-tl-none border border-cyan-500/10 flex items-center gap-1.5 h-10">
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-100"></span>
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-200"></span>
                  </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-black/40 border-t border-white/5">
            <div className="relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about edge calculation..."
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all placeholder:text-slate-600 font-mono"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
