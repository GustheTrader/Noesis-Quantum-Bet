
import React, { useState, useEffect } from 'react';
import { PlayCircle, ExternalLink, Film, AlertCircle, ArrowRight } from 'lucide-react';
import { League } from '../types';

interface NewsItem {
  headline: string;
  description: string;
  images: { url: string }[];
  links: { web: { href: string } };
  video?: { source: string };
  published: string;
}

interface HighlightReelProps {
  activeLeague: League;
}

export const HighlightReel: React.FC<HighlightReelProps> = ({ activeLeague }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const leagueMap: Record<League, string> = {
            NFL: 'football/nfl',
            NBA: 'basketball/nba',
            NHL: 'hockey/nhl',
            MLB: 'baseball/mlb',
            MLS: 'soccer/usa.1',
            SOCCER: 'soccer/eng.1',
            MMA: 'mma/ufc',
            HORSE: 'horse-racing',
            GOLF: 'golf',
            VELOCITY: 'crypto'
        };

        const path = leagueMap[activeLeague] || 'football/nfl';
        
        // Try league specific news first
        let response;
        try {
            response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/news`, {
                mode: 'cors',
                headers: { 'Accept': 'application/json' }
            });
        } catch (e) {
            // If league specific fails with "Failed to fetch", try general sports news
            console.warn(`Specific news fetch failed for ${activeLeague}, falling back to general news`);
            response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/news`, {
                mode: 'cors',
                headers: { 'Accept': 'application/json' }
            });
        }

        if (!response.ok) {
            // If 404 or other error, try general sports news
            response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/news`);
        }

        const data = await response.json();
        setNews(data.articles || []);
      } catch (err) {
        console.error("ESPN News Error", err);
        // Final fallback: empty news instead of crashing
        setNews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [activeLeague]);

  if (loading) return <div className="animate-pulse h-48 bg-slate-900/50 rounded-xl"></div>;

  return (
    <div className="glass-panel p-8 rounded-3xl border border-indigo-500/20 w-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <Film className="text-indigo-400" size={20} />
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-tighter text-xl">
              Media Wire
            </h3>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em]">Real-time ESPN Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-slate-800 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Live Feed</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news.length > 0 ? (
            news.slice(0, 9).map((item, idx) => (
            <a 
                key={idx} 
                href={item.links?.web?.href} 
                target="_blank" 
                rel="noreferrer"
                className="flex flex-col group bg-[#0a0e17]/60 hover:bg-slate-800/40 border border-[#2d334a]/40 hover:border-indigo-500/50 rounded-2xl overflow-hidden transition-all duration-500 shadow-xl hover:shadow-indigo-500/10"
            >
                <div className="relative h-48 w-full overflow-hidden">
                    {item.images?.[0]?.url ? (
                        <img 
                            src={item.images[0].url} 
                            alt="News Thumbnail" 
                            className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                            <Film className="text-slate-700" size={32} />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e17] via-transparent to-transparent opacity-80"></div>
                    <div className="absolute bottom-4 right-4 bg-indigo-600/90 backdrop-blur-md p-2.5 rounded-full text-white shadow-lg transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <PlayCircle size={20} fill="currentColor" className="text-white" />
                    </div>
                </div>
                <div className="p-6 flex-grow flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Analysis</span>
                        <span className="text-[9px] text-slate-500 font-mono">{new Date(item.published).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <h4 className="text-base font-black text-white leading-tight mb-3 group-hover:text-indigo-300 transition-colors line-clamp-2 uppercase tracking-tight">
                        {item.headline}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-3 mb-6 leading-relaxed font-medium">
                        {item.description}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-800/50">
                        <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                            <span>Intelligence Report</span>
                            <ArrowRight size={12} />
                        </div>
                        <ExternalLink size={12} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    </div>
                </div>
            </a>
            ))
        ) : (
            <div className="col-span-full text-center py-20 bg-black/20 border border-dashed border-slate-800 rounded-3xl">
                <AlertCircle className="w-10 h-10 mx-auto mb-4 text-slate-700 opacity-50" />
                <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No intelligence nodes available</p>
            </div>
        )}
      </div>
    </div>
  );
};
