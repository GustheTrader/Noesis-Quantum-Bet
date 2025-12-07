
import React, { useState, useEffect } from 'react';
import { PlayCircle, ExternalLink, Film, AlertCircle } from 'lucide-react';

interface NewsItem {
  headline: string;
  description: string;
  images: { url: string }[];
  links: { web: { href: string } };
  video?: { source: string };
  published: string;
}

export const HighlightReel: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/news');
        if (!response.ok) throw new Error('Failed to fetch news');
        const data = await response.json();
        setNews(data.articles || []);
      } catch (err) {
        console.error("ESPN News Error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) return <div className="animate-pulse h-48 bg-slate-900/50 rounded-xl"></div>;

  return (
    <div className="glass-panel p-6 rounded-2xl border border-indigo-500/20 h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-bold uppercase tracking-widest flex items-center gap-2 text-sm">
          <Film className="text-indigo-400" size={18} />
          Media Wire
        </h3>
        <span className="text-[10px] text-slate-500 font-mono">ESPN FEED</span>
      </div>

      <div className="flex-grow overflow-y-auto custom-scrollbar space-y-4 pr-2">
        {news.length > 0 ? (
            news.map((item, idx) => (
            <a 
                key={idx} 
                href={item.links?.web?.href} 
                target="_blank" 
                rel="noreferrer"
                className="block group bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 hover:border-indigo-500/30 rounded-xl overflow-hidden transition-all"
            >
                <div className="relative h-32 w-full overflow-hidden">
                    {item.images?.[0]?.url ? (
                        <img 
                            src={item.images[0].url} 
                            alt="News Thumbnail" 
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                            <Film className="text-slate-600" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-full text-white group-hover:bg-indigo-500 transition-colors">
                        <PlayCircle size={16} />
                    </div>
                </div>
                <div className="p-4">
                    <h4 className="text-sm font-bold text-slate-200 leading-snug mb-2 group-hover:text-indigo-300 transition-colors line-clamp-2">
                        {item.headline}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                        {item.description}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-600 font-mono uppercase">
                        <span>Read More</span>
                        <ExternalLink size={10} />
                    </div>
                </div>
            </a>
            ))
        ) : (
            <div className="text-center py-10 text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                No clips available.
            </div>
        )}
      </div>
    </div>
  );
};
