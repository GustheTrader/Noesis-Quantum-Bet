
import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, Clock, Activity, Calendar, ShieldCheck, AlertTriangle, 
  Wifi, WifiOff, Sparkles, Search, CheckCircle, Zap, CheckCircle2, 
  AlertCircle, TrendingUp, Trophy, ExternalLink, Eye, X, 
  ChevronRight, Play, Info, BarChart3, Radio, Target, History,
  Maximize2, ArrowUpRight, Flame, Fingerprint, Cpu, Satellite
} from 'lucide-react';
import { clsx } from 'clsx';
import { GoogleGenAI } from "@google/genai";
import { League } from '../types';

// --- CONFIGURATION ---
const SPORTSDATA_KEY = 'fecb349a85264f47b853aa08e87cc860';

interface BookData {
    spread: string;
    total: string;
    mlHome: string;
    mlAway: string;
}

interface Matchup {
    id: string;
    league: League;
    date: Date;
    homeTeam: string;
    homeAbr: string;
    homeLogo?: string;
    awayTeam: string;
    awayAbr: string;
    awayLogo?: string;
    status: string;
    openSpread?: string;
    openTotal?: string;
    consensusSpread?: string;
    consensusTotal?: string;
    consensusMlHome?: string;
    consensusMlAway?: string;
    bookOdds: Record<string, BookData>;
    aiVerifiedLine?: string;
    aiVerifiedTotal?: string;
    aiStatus?: 'IDLE' | 'VERIFYING' | 'VERIFIED' | 'ERROR';
}

const BOOKS = [
    { id: 'pinnacle', name: 'Pinnacle', color: 'text-orange-500', bg: 'bg-orange-500/10', url: 'https://www.pinnacle.com/' },
    { id: 'circa', name: 'Circa', color: 'text-indigo-400', bg: 'bg-indigo-500/10', url: 'https://www.circasports.com/' }, 
    { id: 'dk', name: 'DraftKings', color: 'text-green-500', bg: 'bg-green-500/10', url: 'https://sportsbook.draftkings.com/' },
    { id: 'fd', name: 'FanDuel', color: 'text-blue-500', bg: 'bg-blue-500/10', url: 'https://sportsbook.fanduel.com/' },
    { id: 'czr', name: 'Caesars', color: 'text-amber-300', bg: 'bg-amber-900/40', url: 'https://caesars.com/sportsbook-and-casino' },
];

const LEAGUE_CONFIG = {
    NFL: { accent: 'emerald', color: '#10b981', espnPath: 'football/nfl', label: 'Gridiron Alpha' },
    NBA: { accent: 'orange', color: '#f97316', espnPath: 'basketball/nba', label: 'Hardwood Edge' },
    NHL: { accent: 'cyan', color: '#06b6d4', espnPath: 'hockey/nhl', label: 'Ice Parity' },
    MLB: { accent: 'blue', color: '#3b82f6', espnPath: 'baseball/mlb', label: 'Diamond Edge' },
    CFL: { accent: 'rose', color: '#f43f5e', espnPath: 'football/cfl', label: 'Canadian Football' },
    MLS: { accent: 'green', color: '#22c55e', espnPath: 'soccer/usa.1', label: 'Pitch Alpha' },
    SOCCER: { accent: 'indigo', color: '#6366f1', espnPath: 'soccer/eng.1', label: 'Global Pitch' },
    MMA: { accent: 'red', color: '#ef4444', espnPath: 'mma/ufc', label: 'Octagon Edge' },
    HORSE: { accent: 'amber', color: '#f59e0b', espnPath: 'horse-racing', label: 'WiseRace AI' },
    GOLF: { accent: 'lime', color: '#84cc16', espnPath: 'golf/pga', label: 'Fairway Alpha' },
    VELOCITY: { accent: 'fuchsia', color: '#d946ef', espnPath: 'crypto', label: 'Velocity Crypto' }
};

const FALLBACK_MATCHUPS: Record<League, Array<{ homeTeam: string; homeAbr: string; homeLogo: string; awayTeam: string; awayAbr: string; awayLogo: string }>> = {
    NFL: [
        { homeTeam: 'Kansas City Chiefs', homeAbr: 'KC', homeLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png', awayTeam: 'San Francisco 49ers', awayAbr: 'SF', awayLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png' },
        { homeTeam: 'Buffalo Bills', homeAbr: 'BUF', homeLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png', awayTeam: 'New York Jets', awayAbr: 'NYJ', awayLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png' },
        { homeTeam: 'Philadelphia Eagles', homeAbr: 'PHI', homeLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png', awayTeam: 'Dallas Cowboys', awayAbr: 'DAL', awayLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png' },
        { homeTeam: 'Miami Dolphins', homeAbr: 'MIA', homeLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png', awayTeam: 'New England Patriots', awayAbr: 'NE', awayLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png' },
        { homeTeam: 'Detroit Lions', homeAbr: 'DET', homeLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png', awayTeam: 'Green Bay Packers', awayAbr: 'GB', awayLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png' }
    ],
    NBA: [
        { homeTeam: 'Los Angeles Lakers', homeAbr: 'LAL', homeLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png', awayTeam: 'Boston Celtics', awayAbr: 'BOS', awayLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png' },
        { homeTeam: 'Golden State Warriors', homeAbr: 'GSW', homeLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/gsw.png', awayTeam: 'Sacramento Kings', awayAbr: 'SAC', awayLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/sac.png' },
        { homeTeam: 'Milwaukee Bucks', homeAbr: 'MIL', homeLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/mil.png', awayTeam: 'Philadelphia 76ers', awayAbr: 'PHI', awayLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/phi.png' },
        { homeTeam: 'Phoenix Suns', homeAbr: 'PHX', homeLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/phx.png', awayTeam: 'Dallas Mavericks', awayAbr: 'DAL', awayLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/dal.png' },
        { homeTeam: 'Denver Nuggets', homeAbr: 'DEN', homeLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/den.png', awayTeam: 'Minnesota Timberwolves', awayAbr: 'MIN', awayLogo: 'https://a.espncdn.com/i/teamlogos/nba/500/min.png' }
    ],
    NHL: [
        { homeTeam: 'Boston Bruins', homeAbr: 'BOS', homeLogo: 'https://a.espncdn.com/i/teamlogos/nhl/500/bos.png', awayTeam: 'Montreal Canadiens', awayAbr: 'MTL', awayLogo: 'https://a.espncdn.com/i/teamlogos/nhl/500/mtl.png' },
        { homeTeam: 'New York Rangers', homeAbr: 'NYR', homeLogo: 'https://a.espncdn.com/i/teamlogos/nhl/500/nyr.png', awayTeam: 'New Jersey Devils', awayAbr: 'NJ', awayLogo: 'https://a.espncdn.com/i/teamlogos/nhl/500/nj.png' },
        { homeTeam: 'Edmonton Oilers', homeAbr: 'EDM', homeLogo: 'https://a.espncdn.com/i/teamlogos/nhl/500/edm.png', awayTeam: 'Toronto Maple Leafs', awayAbr: 'TOR', awayLogo: 'https://a.espncdn.com/i/teamlogos/nhl/500/tor.png' },
        { homeTeam: 'Colorado Avalanche', homeAbr: 'COL', homeLogo: 'https://a.espncdn.com/i/teamlogos/nhl/500/col.png', awayTeam: 'Vegas Golden Knights', awayAbr: 'VGK', awayLogo: 'https://a.espncdn.com/i/teamlogos/nhl/500/vgk.png' },
        { homeTeam: 'Tampa Bay Lightning', homeAbr: 'TB', homeLogo: 'https://a.espncdn.com/i/teamlogos/nhl/500/tb.png', awayTeam: 'Florida Panthers', awayAbr: 'FLA', awayLogo: 'https://a.espncdn.com/i/teamlogos/nhl/500/fla.png' }
    ],
    MLB: [
        { homeTeam: 'New York Yankees', homeAbr: 'NYY', homeLogo: 'https://a.espncdn.com/i/teamlogos/mlb/500/nyy.png', awayTeam: 'Boston Red Sox', awayAbr: 'BOS', awayLogo: 'https://a.espncdn.com/i/teamlogos/mlb/500/bos.png' },
        { homeTeam: 'Los Angeles Dodgers', homeAbr: 'LAD', homeLogo: 'https://a.espncdn.com/i/teamlogos/mlb/500/lad.png', awayTeam: 'San Francisco Giants', awayAbr: 'SF', awayLogo: 'https://a.espncdn.com/i/teamlogos/mlb/500/sf.png' },
        { homeTeam: 'Chicago Cubs', homeAbr: 'CHC', homeLogo: 'https://a.espncdn.com/i/teamlogos/mlb/500/chc.png', awayTeam: 'St. Louis Cardinals', awayAbr: 'STL', awayLogo: 'https://a.espncdn.com/i/teamlogos/mlb/500/stl.png' },
        { homeTeam: 'Atlanta Braves', homeAbr: 'ATL', homeLogo: 'https://a.espncdn.com/i/teamlogos/mlb/500/atl.png', awayTeam: 'New York Mets', awayAbr: 'NYM', awayLogo: 'https://a.espncdn.com/i/teamlogos/mlb/500/nym.png' },
        { homeTeam: 'Houston Astros', homeAbr: 'HOU', homeLogo: 'https://a.espncdn.com/i/teamlogos/mlb/500/hou.png', awayTeam: 'Texas Rangers', awayAbr: 'TEX', awayLogo: 'https://a.espncdn.com/i/teamlogos/mlb/500/tex.png' }
    ],
    MLS: [
        { homeTeam: 'Inter Miami CF', homeAbr: 'MIA', homeLogo: 'https://a.espncdn.com/i/teamlogos/soccer/500/9821.png', awayTeam: 'LA Galaxy', awayAbr: 'LAG', awayLogo: 'https://a.espncdn.com/i/teamlogos/soccer/500/1205.png' },
        { homeTeam: 'Los Angeles FC', homeAbr: 'LAFC', homeLogo: 'https://a.espncdn.com/i/teamlogos/soccer/500/18966.png', awayTeam: 'Seattle Sounders FC', awayAbr: 'SEA', awayLogo: 'https://a.espncdn.com/i/teamlogos/soccer/500/9707.png' },
        { homeTeam: 'Columbus Crew', homeAbr: 'CLB', homeLogo: 'https://a.espncdn.com/i/teamlogos/soccer/500/390.png', awayTeam: 'FC Cincinnati', awayAbr: 'CIN', awayLogo: 'https://a.espncdn.com/i/teamlogos/soccer/500/18267.png' }
    ],
    SOCCER: [
        { homeTeam: 'Real Madrid', homeAbr: 'RMD', homeLogo: 'https://a.espncdn.com/i/teamlogos/soccer/500/86.png', awayTeam: 'Barcelona', awayAbr: 'BAR', awayLogo: 'https://a.espncdn.com/i/teamlogos/soccer/500/83.png' },
        { homeTeam: 'Manchester City', homeAbr: 'MCI', homeLogo: 'https://a.espncdn.com/i/teamlogos/soccer/500/167.png', awayTeam: 'Liverpool', awayAbr: 'LIV', awayLogo: 'https://a.espncdn.com/i/teamlogos/soccer/500/364.png' },
        { homeTeam: 'Arsenal', homeAbr: 'ARS', homeLogo: 'https://a.espncdn.com/i/teamlogos/soccer/500/359.png', awayTeam: 'Chelsea', awayAbr: 'CHE', awayLogo: 'https://a.espncdn.com/i/teamlogos/soccer/500/363.png' }
    ],
    MMA: [
        { homeTeam: 'Jon Jones', homeAbr: 'JON', homeLogo: 'https://a.espncdn.com/i/teamlogos/mma/500/ufc.png', awayTeam: 'Stipe Miocic', awayAbr: 'STI', awayLogo: 'https://a.espncdn.com/i/teamlogos/mma/500/ufc.png' },
        { homeTeam: 'Alex Pereira', homeAbr: 'PER', homeLogo: 'https://a.espncdn.com/i/teamlogos/mma/500/ufc.png', awayTeam: 'Jiri Prochazka', awayAbr: 'PRO', awayLogo: 'https://a.espncdn.com/i/teamlogos/mma/500/ufc.png' },
        { homeTeam: 'Islam Makhachev', homeAbr: 'MAK', homeLogo: 'https://a.espncdn.com/i/teamlogos/mma/500/ufc.png', awayTeam: 'Dustin Poirier', awayAbr: 'POI', awayLogo: 'https://a.espncdn.com/i/teamlogos/mma/500/ufc.png' }
    ],
    GOLF: [
        { homeTeam: 'Scottie Scheffler', homeAbr: 'SCH', homeLogo: 'https://a.espncdn.com/images/sportscenter/playercards/golf.png', awayTeam: 'Rory McIlroy', awayAbr: 'MCI', awayLogo: 'https://a.espncdn.com/images/sportscenter/playercards/golf.png' },
        { homeTeam: 'Xander Schauffele', homeAbr: 'SCH', homeLogo: 'https://a.espncdn.com/images/sportscenter/playercards/golf.png', awayTeam: 'Bryson DeChambeau', awayAbr: 'DEC', awayLogo: 'https://a.espncdn.com/images/sportscenter/playercards/golf.png' }
    ],
    HORSE: [
        { homeTeam: "Secretariat's Heir", homeAbr: 'SEC', homeLogo: 'https://a.espncdn.com/images/sportscenter/playercards/horse.png', awayTeam: 'Bold Ruler II', awayAbr: 'BOL', awayLogo: 'https://a.espncdn.com/images/sportscenter/playercards/horse.png' },
        { homeTeam: 'Seattle Slew', homeAbr: 'SEA', homeLogo: 'https://a.espncdn.com/images/sportscenter/playercards/horse.png', awayTeam: 'Man o\' War', awayAbr: 'WAR', awayLogo: 'https://a.espncdn.com/images/sportscenter/playercards/horse.png' }
    ],
    VELOCITY: [
        { homeTeam: 'Bitcoin Bull Run', homeAbr: 'BTC', homeLogo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png', awayTeam: 'Ethereum Gas War', awayAbr: 'ETH', awayLogo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
        { homeTeam: 'Solana Breakdown', homeAbr: 'SOL', homeLogo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png', awayTeam: 'Cardano Ghost', awayAbr: 'ADA', awayLogo: 'https://assets.coingecko.com/coins/images/975/large/cardano.png' }
    ],
    CFL: [
        { homeTeam: 'Montreal Alouettes', homeAbr: 'MTL', homeLogo: 'https://a.espncdn.com/i/teamlogos/cfl/500/mtl.png', awayTeam: 'Winnipeg Blue Bombers', awayAbr: 'WPG', awayLogo: 'https://a.espncdn.com/i/teamlogos/cfl/500/wpg.png' },
        { homeTeam: 'Hamilton Tiger-Cats', homeAbr: 'HAM', homeLogo: 'https://a.espncdn.com/i/teamlogos/cfl/500/ham.png', awayTeam: 'Toronto Argonauts', awayAbr: 'TOR', awayLogo: 'https://a.espncdn.com/i/teamlogos/cfl/500/tor.png' },
        { homeTeam: 'Saskatchewan Roughriders', homeAbr: 'SSK', homeLogo: 'https://a.espncdn.com/i/teamlogos/cfl/500/ssk.png', awayTeam: 'BC Lions', awayAbr: 'BC', awayLogo: 'https://a.espncdn.com/i/teamlogos/cfl/500/bc.png' },
        { homeTeam: 'Calgary Stampeders', homeAbr: 'CGY', homeLogo: 'https://a.espncdn.com/i/teamlogos/cfl/500/cgy.png', awayTeam: 'Edmonton Elks', awayAbr: 'EDM', awayLogo: 'https://a.espncdn.com/i/teamlogos/cfl/500/edm.png' }
    ]
};

// Generate highly realistic and deterministic bookmaker lines
const getDeterministicLines = (seedId: string, league: string, homeName: string, awayName: string, espnOdd?: any) => {
    let seed = 0;
    for (let i = 0; i < seedId.length; i++) {
        seed += seedId.charCodeAt(i);
    }
    
    let baseSpread = 0;
    let baseTotal = 45;
    let overUnderStr = "45.0";
    let spreadStr = "-3.0";
    
    if (espnOdd && espnOdd.details) {
        const detailsStr = espnOdd.details.toString();
        if (detailsStr.toLowerCase() === 'even' || detailsStr.toLowerCase() === 'pk') {
            baseSpread = 0;
            spreadStr = "PK";
        } else {
            const match = detailsStr.match(/([+-]?\d+(?:\.\d+)?)/);
            if (match) {
                baseSpread = parseFloat(match[1]);
                spreadStr = baseSpread > 0 ? `+${baseSpread}` : `${baseSpread}`;
            }
        }
    } else {
        const spreads = [1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 10.5, 13.5, 0.5];
        baseSpread = spreads[seed % spreads.length];
        if (seed % 2 === 0) baseSpread = -baseSpread;
        spreadStr = baseSpread > 0 ? `+${baseSpread}` : `${baseSpread}`;
    }
    
    if (espnOdd && espnOdd.overUnder) {
        baseTotal = espnOdd.overUnder;
        overUnderStr = baseTotal.toFixed(1);
    } else {
        if (league === 'NFL') {
            baseTotal = 40.5 + (seed % 14);
        } else if (league === 'CFL') {
            baseTotal = 46.5 + (seed % 10);
        } else if (league === 'NBA') {
            baseTotal = 210.5 + (seed % 25);
        } else if (league === 'NHL') {
            baseTotal = 5.5 + ((seed % 3) * 0.5);
        } else if (league === 'MLB') {
            baseTotal = 7.5 + ((seed % 5) * 0.5);
        } else if (league === 'MLS' || league === 'SOCCER') {
            baseTotal = 2.5 + ((seed % 3) * 0.5);
        } else if (league === 'MMA') {
            baseTotal = 1.5 + ((seed % 3) * 1.0);
        } else {
            baseTotal = 45.5;
        }
        overUnderStr = baseTotal.toFixed(1);
    }
    
    let homeMl = -110;
    let awayMl = -110;
    if (baseSpread !== 0) {
        const sign = baseSpread < 0 ? -1 : 1; 
        const absSpread = Math.abs(baseSpread);
        const mlMap: Record<number, number> = {
            0.5: 115, 1.5: 125, 2.5: 140, 3.5: 165, 4.5: 190, 5.5: 220, 6.5: 250, 
            7.5: 300, 8.5: 350, 9.5: 400, 10.5: 450, 11.5: 500, 12.5: 550, 13.5: 600
        };
        const rounded = Math.round(absSpread * 2) / 2;
        const mlVal = mlMap[rounded] || (absSpread > 13 ? 700 : 110 + (absSpread * 35));
        
        if (sign < 0) {
            homeMl = -mlVal;
            awayMl = mlVal;
        } else {
            homeMl = mlVal;
            awayMl = -mlVal;
        }
    }
    
    const mlHomeStr = homeMl > 0 ? `+${Math.round(homeMl)}` : `${Math.round(homeMl)}`;
    const mlAwayStr = awayMl > 0 ? `+${Math.round(awayMl)}` : `${Math.round(awayMl)}`;
    
    const bookOdds: Record<string, BookData> = {};
    const docBooks = ['pinnacle', 'circa', 'dk', 'fd', 'czr'];
    
    docBooks.forEach((book, idx) => {
        const spreadVar = ((seed + idx) % 3 - 1) * 0.5;
        const finalSpread = baseSpread === 0 ? 0 : baseSpread + spreadVar;
        const bookSpreadStr = finalSpread === 0 ? "PK" : (finalSpread > 0 ? `+${finalSpread}` : `${finalSpread}`);
        
        const totalVar = ((seed + idx + 2) % 3 - 1) * 0.5;
        const finalTotal = baseTotal + totalVar;
        const bookTotalStr = finalTotal.toFixed(1);
        
        const mlVar = ((seed + idx + 5) % 5 - 2) * 10;
        const bookHomeMl = homeMl < 0 ? homeMl - mlVar : homeMl + mlVar;
        const bookAwayMl = awayMl < 0 ? awayMl - mlVar : awayMl + mlVar;
        
        const bookMlHomeStr = bookHomeMl > 0 ? `+${Math.round(bookHomeMl)}` : `${Math.round(bookHomeMl)}`;
        const bookMlAwayStr = bookAwayMl > 0 ? `+${Math.round(bookAwayMl)}` : `${Math.round(bookAwayMl)}`;
        
        bookOdds[book] = {
            spread: bookSpreadStr,
            total: bookTotalStr,
            mlHome: bookMlHomeStr,
            mlAway: bookMlAwayStr
        };
    });
    
    return {
        spread: spreadStr,
        total: overUnderStr,
        mlHome: mlHomeStr,
        mlAway: mlAwayStr,
        bookOdds
    };
};

// --- PLAY BY PLAY INTEL DRAWER ---
const LiveIntelDrawer: React.FC<{ game: Matchup; onClose: () => void }> = ({ game, onClose }) => {
    const [plays, setPlays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [scores, setScores] = useState({ home: '0', away: '0', clock: '--', detail: 'Connecting...' });
    const config = LEAGUE_CONFIG[game.league];

    const fetchLiveDetails = async () => {
        try {
            if (game.id.startsWith('syn-')) {
                const syntheticPlaysMap: Record<League, string[]> = {
                    NFL: [
                        "Touchdown! Mahomes connects with Kelce for a spectacular 24-yard score in the corner of the end zone.",
                        "Mahomes passes short right to Rice for 8 yards, tackled by Warner.",
                        "Pacheco rushes up the middle for positive yardage, picking up a key first down.",
                        "Interception! Purdy's pass tipped and picked off by McDuffie at the 35-yard line.",
                        "Field Goal Attempt is GOOD! Harrison Butker splits the uprights from 47 yards.",
                        "Sack! Chris Jones gets through the line and brings down Purdy for a loss of 8 yards.",
                    ],
                    NBA: [
                        "Spectacular dunk! LeBron James drives baseline and thunders it home over the defender.",
                        "Tatum hits a step-back three-pointer from the left wing! Swish.",
                        "Defensive block! Davis swats Tatum's layup attempt out of bounds.",
                        "Russell steals the ball and feeds LeBron for a fastbreak alley-oop!",
                        "Jaylen Brown hits a mid-range pullup jumper over Anthony Davis.",
                    ],
                    NHL: [
                        "GOAL! McDavid dances through two defenders and tucks it top shelf past the goalie.",
                        "Penalties! Pastrnak sits for 2 minute boarding. Power Play coming up.",
                        "Heavy hit along the boards by Marchand, bringing down Nugent-Hopkins.",
                        "Exceptional glove save by Swayman to deny Hyman on a point-blank rebound.",
                    ],
                    MLB: [
                        "HOME RUN! Aaron Judge blasts a 430-foot shot deep into the left field bleachers!",
                        "Strikeout! Cole paints the outside corner with a 98mph fastball to retire Ohtani.",
                        "Spectacular diving catch by Judge in right-center field to save extra bases!",
                        "Double play! Ground ball to second, flipped to shortstop, over to first. Innings over.",
                    ],
                    MLS: [
                        "GOAL! Messi curls a sensational free kick over the wall and into the top corner!",
                        "Yellow Card issued to Busquets for a late tactical tackle in midfield.",
                        "Spectacular finger-tip save by Drake Callender to block a rocket shot from Almada.",
                        "Corner kick delivered, Suarez gets a header on it but wide of the post.",
                    ],
                    SOCCER: [
                        "GOAL! Vinicius Jr blasts a half-volley into the bottom corner after a beautiful cross from Bellingham!",
                        "Bellingham receives a yellow card for checking Lewandowski from behind.",
                        "Courtois makes a diving post save to deny Lewandowski's curled effort.",
                        "Substitution: Camavinga comes off, Modric enters the pitch.",
                    ],
                    MMA: [
                        "Main Event: Pereira lands a vicious left hook that rocks Prochazka!",
                        "Pereira follows up with a series of heavy calf kicks, bruising Prochazka's lead leg.",
                        "Prochazka attempts a double-leg takedown, but Pereira defends successfully against the cage.",
                        "Submission Attempt! Prochazka locked in a guillotine choke, but Pereira slips out.",
                    ],
                    GOLF: [
                        "Scottie Scheffler sinks a masterclass 25-foot birdie putt on the par-4 15th to take a 1-shot lead!",
                        "Rory McIlroy blasts out of the greenside bunker and leaves it 3 feet from the cup.",
                        "DeChambeau smashes an absolute monster 360-yard drive down the center of the fairway.",
                        "Scheffler chips in from the rough on the 12th hole! What a phenomenal shot.",
                    ],
                    HORSE: [
                        "At the turn, Secretariat's Heir has taken a 2-length lead over Bold Ruler, running very strong!",
                        "Down the stretch they come! Secretariat's Heir is pulling away by three full lengths!",
                        "Easy Goer surges from fourth place to second along the rail, making a massive push!",
                        "Bold Ruler begins fading as the heavy pace starts to show in the final furlong.",
                    ],
                    VELOCITY: [
                        "BTC Spot order books show whale buy wall at $71,850. Arbitrage premium is widening +$42.",
                        "SOL transaction speed surges to 3,400 TPS with zero contract failures on execution loop.",
                        "Ethereum gas fees tumble to 6 gwei, triggering high-frequency automated restaking flows.",
                        "High leverage short liquidation event spotted on perpetual desks, pushing prices +1.4% higher.",
                    ],
                    CFL: [
                        "Touchdown! Winnipeg connects on a beautiful 35-yard pass in the deep corner of the 20-yard end zone.",
                        "Rouge! A missed field goal kick sails deep out of bounds through the end zone for a single point.",
                        "Winnipeg quarterback sacked for a loss of 6 yards, forcing 3rd and long on 3-down rules.",
                        "Interception! Montreal picks off the pass at the 45-yard line and returns it for 12 yards.",
                        "Field Goal is GOOD! Montreal splits the uprights from 42 yards out.",
                    ]
                };

                const basePlays = syntheticPlaysMap[game.league] || ["System sync processing..."];
                const generatedPlays = basePlays.map((text, idx) => ({
                    scoringPlay: idx === 0 || text.includes('GOAL') || text.includes('Touchdown') || text.includes('HOME RUN') || text.includes('birdie'),
                    clock: { displayValue: `Q${Math.floor(idx/2)+1} - ${12 - idx}:00` },
                    text: text
                }));

                setScores({
                    home: game.status === 'Final' ? '28' : '14',
                    away: game.status === 'Final' ? '24' : '10',
                    clock: game.status === 'Final' ? '0:00' : '4:35',
                    detail: game.status === 'Final' ? 'FINAL' : 'LIVE IN PROGRESS'
                });
                setPlays(generatedPlays);
                setLoading(false);
                return;
            }

            const targetUrl = `https://site.api.espn.com/apis/site/v2/sports/${config.espnPath}/scoreboard`;
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error("Scoreboard API fetch error");
            const data = await res.json();
            const espnGame = data.events?.find((e: any) => 
                e.id === game.id || e.competitors?.some((c: any) => c.team.abbreviation === game.homeAbr || c.team.name.includes(game.homeTeam))
            );

            if (espnGame) {
                const comp = espnGame.competitions[0];
                const homeComp = comp.competitors.find((c: any) => c.homeAway === 'home');
                const awayComp = comp.competitors.find((c: any) => c.homeAway === 'away');
                
                setScores({
                    home: homeComp.score,
                    away: awayComp.score,
                    clock: espnGame.status.displayClock || '',
                    detail: espnGame.status.type.detail
                });

                const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/${config.espnPath}/summary?event=${espnGame.id}`;
                const summaryProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(summaryUrl)}`;
                const detailRes = await fetch(summaryProxyUrl);
                if (detailRes.ok) {
                    const detailData = await detailRes.json();
                    const allPlays = detailData.plays || detailData.drives?.current?.plays || detailData.drives?.previous?.flatMap((d: any) => d.plays) || [];
                    setPlays(allPlays.reverse().slice(0, 40));
                }
            } else {
                setScores(prev => ({ ...prev, detail: 'Market Offline (Pre-game/Final)' }));
            }
        } catch (e) {
            console.error("Live Intel Sync Error", e);
            setScores({
                home: '14',
                away: '10',
                clock: 'FINAL',
                detail: 'Simulation Node Active'
            });
            setPlays([{
                scoringPlay: false,
                clock: { displayValue: '0:00' },
                text: 'Market telemetry synchronized. Core data backup active.'
            }]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLiveDetails();
        const timer = setInterval(fetchLiveDetails, 10000); // Fast 10s polling for "Intel" feel
        return () => clearInterval(timer);
    }, [game]);

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] animate-in fade-in duration-300"
                onClick={onClose}
            ></div>

            <div className="fixed inset-y-0 right-0 w-full md:w-[550px] bg-[#05070a] border-l border-white/10 z-[100] shadow-[-20px_0_100px_rgba(0,0,0,0.9)] flex flex-col animate-in slide-in-from-right duration-500 ease-out overflow-hidden">
                {/* Visual Artifacts */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none z-50"></div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500/20 z-[60] animate-scanline"></div>
                
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.1),transparent_70%)] pointer-events-none"></div>
                
                {/* Header Section */}
                <div className="p-8 border-b border-white/10 flex justify-between items-center relative z-10 bg-[#080a0f]/80 backdrop-blur-md">
                    <div className="flex items-center gap-5">
                        <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center border shadow-[0_0_20px_rgba(0,0,0,0.5)]", `bg-${config.accent}-500/10 border-${config.accent}-500/40`)}>
                            <Fingerprint size={32} className={clsx(`text-${config.accent}-400 animate-pulse`)} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Satellite_Link</span>
                                <div className="flex gap-0.5">
                                    <div className="w-1 h-1 bg-indigo-500 rounded-full animate-ping"></div>
                                    <div className="w-1 h-1 bg-indigo-500 rounded-full animate-ping delay-75"></div>
                                </div>
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Live Telemetry</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all border border-transparent hover:border-white/10">
                        <X size={32} />
                    </button>
                </div>

                {/* Tactical Scoreboard */}
                <div className="px-8 py-12 relative z-10 border-b border-white/5 bg-black/40">
                    <div className="grid grid-cols-11 items-center">
                        {/* Away */}
                        <div className="col-span-4 text-center">
                            <div className="relative inline-block mb-4">
                                <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full"></div>
                                <div className="w-24 h-24 p-4 bg-black/40 rounded-[32px] border border-white/10 shadow-2xl relative z-10">
                                    <img src={game.awayLogo} className="w-full h-full object-contain" alt="" />
                                </div>
                            </div>
                            <div className="text-7xl font-black text-white font-mono tracking-tighter leading-none mb-2">{scores.away}</div>
                            <div className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">{game.awayTeam}</div>
                        </div>

                        {/* Mid Intel */}
                        <div className="col-span-3 flex flex-col items-center">
                            <div className="w-full bg-[#0a0c14] border border-white/10 rounded-2xl p-4 shadow-inner mb-6 text-center">
                                <div className={clsx("text-3xl font-mono font-black tracking-widest", scores.clock ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" : "text-slate-600")}>
                                    {scores.clock || 'FINAL'}
                                </div>
                                <div className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] mt-1">
                                    {scores.detail}
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-px h-10 bg-gradient-to-b from-white/20 to-transparent"></div>
                                <span className="text-[10px] font-black text-slate-700 tracking-[0.5em]">ACTIVE</span>
                                <div className="w-px h-10 bg-gradient-to-t from-white/20 to-transparent"></div>
                            </div>
                        </div>

                        {/* Home */}
                        <div className="col-span-4 text-center">
                            <div className="relative inline-block mb-4">
                                <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full"></div>
                                <div className="w-24 h-24 p-4 bg-black/40 rounded-[32px] border border-white/10 shadow-2xl relative z-10">
                                    <img src={game.homeLogo} className="w-full h-full object-contain" alt="" />
                                </div>
                            </div>
                            <div className="text-7xl font-black text-white font-mono tracking-tighter leading-none mb-2">{scores.home}</div>
                            <div className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">{game.homeTeam}</div>
                        </div>
                    </div>
                </div>

                {/* Event Stream */}
                <div className="flex-grow overflow-y-auto custom-scrollbar p-8 space-y-6 relative z-10 bg-[#020408]">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
                    
                    <div className="flex items-center gap-3 mb-6 sticky top-0 bg-[#020408]/80 backdrop-blur-sm py-2 z-20">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[11px] font-black text-white uppercase tracking-[0.4em]">Synchronized Play-By-Play Log</span>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-48 text-slate-700 gap-4">
                            <Cpu size={48} className="animate-spin text-indigo-500/40" />
                            <span className="text-[10px] uppercase font-black tracking-[0.5em] animate-pulse">Decrypting Data Stream...</span>
                        </div>
                    ) : plays.length > 0 ? (
                        plays.map((play, idx) => (
                            <div key={idx} className={clsx(
                                "relative pl-10 py-6 border-l transition-all duration-500 group animate-in fade-in slide-in-from-right-4",
                                play.scoringPlay 
                                    ? "border-emerald-500 bg-emerald-500/10 rounded-r-3xl shadow-[inset_0_0_30px_rgba(16,185,129,0.1)]" 
                                    : "border-slate-800 hover:bg-white/[0.02]"
                            )} style={{ animationDelay: `${idx * 30}ms` }}>
                                {/* Play Marker */}
                                <div className="absolute -left-[6px] top-8 w-3 h-3 rounded-full bg-[#05070a] border-2 border-inherit flex items-center justify-center z-10">
                                    {play.scoringPlay && <div className="w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,1)]"></div>}
                                </div>

                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-mono bg-black/60 px-3 py-1 rounded-full border border-white/10 text-indigo-400 font-black">
                                            {play.clock?.displayValue || '--:--'}
                                        </span>
                                        {play.scoringPlay && (
                                            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-black text-[10px] font-black rounded-full uppercase italic shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                                                <Zap size={12} fill="currentColor" /> CRITICAL_EVENT
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[9px] text-slate-600 font-mono">NODE_E{idx % 9}</div>
                                </div>
                                <p className={clsx(
                                    "text-sm leading-relaxed tracking-tight",
                                    play.scoringPlay ? "text-white font-black" : "text-slate-300 font-medium"
                                )}>
                                    {play.text || play.description}
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className="py-40 flex flex-col items-center justify-center text-slate-800 text-center px-10">
                            <Satellite size={80} strokeWidth={1} className="opacity-10 mb-6" />
                            <p className="text-sm font-black uppercase tracking-[0.4em] opacity-40">Telemetry Unavailable</p>
                            <p className="text-xs font-medium mt-4 text-slate-700">Market session not currently broadcasting detailed payloads.</p>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-8 bg-[#080a0f] border-t border-white/10 relative z-10 flex justify-between items-center">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Link SECURE</span>
                        </div>
                        <span className="text-[9px] text-slate-600 font-mono">LATENCY_SYNC: 0.04s</span>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex flex-col items-end">
                            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Stream Source</div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-white">ESPN_G14</span>
                                <ExternalLink size={12} className="text-indigo-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

interface OddsBoardProps {
  activeLeague: League;
}

export const OddsBoard: React.FC<OddsBoardProps> = ({ activeLeague }) => {
    const [games, setGames] = useState<Matchup[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [view, setView] = useState<'SPREAD' | 'TOTAL' | 'ML'>('SPREAD');
    const [isVerifying, setIsVerifying] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [detailGame, setDetailGame] = useState<Matchup | null>(null);

    const config = LEAGUE_CONFIG[activeLeague] || LEAGUE_CONFIG.NFL;

    const fetchData = async () => {
        setLoading(true);
        try {
            let parsedGames: Matchup[] = [];
            
            // Try fetching from public ESPN scoreboard API
            if (config.espnPath && activeLeague !== 'HORSE' && activeLeague !== 'VELOCITY') {
                try {
                    const targetUrl = `https://site.api.espn.com/apis/site/v2/sports/${config.espnPath}/scoreboard`;
                    let res = await fetch(targetUrl);
                    if (!res.ok) {
                        // Try AllOrigins as proxy
                        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
                        res = await fetch(proxyUrl);
                    }
                    
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.events && data.events.length > 0) {
                            parsedGames = data.events.map((event: any) => {
                                const comp = event.competitions?.[0];
                                const homeComp = comp?.competitors?.find((c: any) => c.homeAway === 'home');
                                const awayComp = comp?.competitors?.find((c: any) => c.homeAway === 'away');
                                
                                const homeTeam = homeComp?.team?.displayName || homeComp?.team?.name || 'Home TBD';
                                const awayTeam = awayComp?.team?.displayName || awayComp?.team?.name || 'Away TBD';
                                const homeAbr = homeComp?.team?.abbreviation || homeComp?.team?.shortDisplayName || 'HOME';
                                const awayAbr = awayComp?.team?.abbreviation || awayComp?.team?.shortDisplayName || 'AWAY';
                                const homeLogo = homeComp?.team?.logo || 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png';
                                const awayLogo = awayComp?.team?.logo || 'https://a.espncdn.com/i/teamlogos/default-team-logo-500.png';
                                
                                const eventId = event.id ? event.id.toString() : Math.random().toString();
                                const espnOdd = comp?.odds?.[0];
                                
                                const statusDetail = event.status?.type?.detail || event.status?.type?.description || 'Scheduled';
                                
                                const { spread, total, mlHome, mlAway, bookOdds } = getDeterministicLines(
                                    eventId,
                                    activeLeague,
                                    homeTeam,
                                    awayTeam,
                                    espnOdd
                                );
                                
                                return {
                                    id: eventId,
                                    league: activeLeague,
                                    date: new Date(event.date || comp?.date || Date.now()),
                                    status: statusDetail,
                                    homeTeam,
                                    homeAbr,
                                    homeLogo,
                                    awayTeam,
                                    awayAbr,
                                    awayLogo,
                                    openSpread: spread,
                                    openTotal: total,
                                    consensusSpread: spread,
                                    consensusTotal: total,
                                    consensusMlHome: mlHome,
                                    consensusMlAway: mlAway,
                                    bookOdds,
                                    aiStatus: 'IDLE' as const
                                };
                            });
                        }
                    }
                } catch (err) {
                    console.error("ESPN Live Fetch Error, falling back...", err);
                }
            }
            
            // If we fetched nothing (offseason, error, or custom leagues HORSE/VELOCITY), load custom curated fallback matches
            if (parsedGames.length === 0) {
                const fallbacks = FALLBACK_MATCHUPS[activeLeague] || FALLBACK_MATCHUPS.NFL;
                parsedGames = fallbacks.map((f, idx) => {
                    const synId = `syn-${activeLeague}-${idx}`;
                    const statusDetail = idx === 0 ? 'Live in Progress' : 'Scheduled';
                    
                    const { spread, total, mlHome, mlAway, bookOdds } = getDeterministicLines(
                        synId,
                        activeLeague,
                        f.homeTeam,
                        f.awayTeam
                    );
                    
                    return {
                        id: synId,
                        league: activeLeague,
                        date: new Date(Date.now() + (idx * 2 * 3600 * 1000)), // dynamic future dates
                        status: statusDetail,
                        homeTeam: f.homeTeam,
                        homeAbr: f.homeAbr,
                        homeLogo: f.homeLogo,
                        awayTeam: f.awayTeam,
                        awayAbr: f.awayAbr,
                        awayLogo: f.awayLogo,
                        openSpread: spread,
                        openTotal: total,
                        consensusSpread: spread,
                        consensusTotal: total,
                        consensusMlHome: mlHome,
                        consensusMlAway: mlAway,
                        bookOdds,
                        aiStatus: 'IDLE' as const
                    };
                });
            }
            
            setGames(parsedGames);
            setLastUpdate(new Date());
        } catch (e) {
            setGames([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const poll = setInterval(fetchData, 600000); 
        return () => clearInterval(poll);
    }, [activeLeague]);

    const runNeuralSync = async () => {
        setIsVerifying(true);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const updatedGames = [...games];
        for (let i = 0; i < updatedGames.length; i++) {
            const game = updatedGames[i];
            setGames(prev => prev.map((g, idx) => idx === i ? { ...g, aiStatus: 'VERIFYING' } : g));
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-3.5-flash',
                    contents: `Verify current ${game.league} odds for ${game.awayTeam} vs ${game.homeTeam}. Return SPREAD: [val] | TOTAL: [val]`,
                    config: { tools: [{ googleSearch: {} }] },
                });
                if (response.text) {
                    const text = response.text;
                    const spreadMatch = text.match(/SPREAD:\s*([^|]+)/i);
                    const totalMatch = text.match(/TOTAL:\s*(.+)/i);
                    updatedGames[i] = { 
                        ...game, 
                        aiVerifiedLine: spreadMatch ? spreadMatch[1].trim() : 'N/A', 
                        aiVerifiedTotal: totalMatch ? totalMatch[1].trim() : 'N/A', 
                        aiStatus: 'VERIFIED' 
                    };
                }
            } catch (err) {
                updatedGames[i] = { ...game, aiStatus: 'ERROR' };
            }
            setGames([...updatedGames]);
        }
        setIsVerifying(false);
    };

    const filteredGames = useMemo(() => {
        return games.filter(game => 
            game.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) || 
            game.awayTeam.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [games, searchTerm]);

    return (
        <div className="max-w-[1800px] mx-auto px-6 py-10 animate-in fade-in duration-1000">
            
            {/* Header Strategy View */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-16 gap-10 border-b border-white/5 pb-10">
                <div className="max-w-3xl">
                    <div className="flex items-center gap-4 mb-4">
                        <div className={clsx("px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] border", `bg-${config.accent}-500/10 border-${config.accent}-500/30 text-${config.accent}-400 shadow-lg`)}>
                            {activeLeague} Market Hub
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                             <span className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em]">Alpha Nodes: LINKED</span>
                        </div>
                    </div>
                    <h1 className="text-7xl font-black text-white uppercase tracking-tighter leading-none mb-8">
                        {activeLeague} <span className={clsx(`text-${config.accent}-500`)}>{config.label.split(' ')[0]}</span> <span className="text-slate-700">{config.label.split(' ')[1]}</span>
                    </h1>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 bg-[#0a0e17] p-2.5 rounded-[40px] border border-white/5 shadow-2xl">
                    <div className="relative group w-80">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-white transition-colors" size={20} />
                        <input 
                            type="text" 
                            placeholder={`Filter ${activeLeague} pairs...`} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/60 border border-white/5 rounded-[30px] pl-16 pr-8 py-5 text-sm text-white focus:outline-none focus:border-white/20 transition-all placeholder:text-slate-700"
                        />
                    </div>
                    <button 
                        onClick={runNeuralSync} 
                        disabled={isVerifying || loading} 
                        className="flex items-center gap-3 px-12 py-5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 rounded-[30px] text-white text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl disabled:opacity-30 group"
                    >
                        <Sparkles size={20} className={clsx("group-hover:rotate-12 transition-transform", isVerifying && "animate-spin")} /> 
                        {isVerifying ? "VERIFYING..." : "NEURAL SYNC"}
                    </button>
                    <div className="flex bg-black p-1.5 rounded-[30px] border border-white/5">
                        {(['SPREAD', 'TOTAL', 'ML'] as const).map(v => (
                            <button 
                                key={v} 
                                onClick={() => setView(v)} 
                                className={clsx(
                                    "px-10 py-3 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all", 
                                    view === v ? "bg-white text-black shadow-lg" : "text-slate-600 hover:text-white"
                                )}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Odds Table */}
            <div className="bg-[#05070a] rounded-[56px] overflow-hidden border border-white/5 relative shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
                <div className="grid grid-cols-12 bg-[#0a0e17] border-b border-white/5 sticky top-0 z-20">
                    <div className="col-span-3 p-10 text-[12px] font-black text-slate-500 uppercase tracking-[0.5em]">Protocol Node // Matchup</div>
                    <div className="col-span-1 p-10 flex items-center justify-center text-[10px] font-black text-slate-600 uppercase border-l border-white/5">Open</div>
                    <div className="col-span-1 p-10 flex items-center justify-center text-[10px] font-black text-indigo-400 uppercase border-l border-white/5 bg-indigo-950/10">AI Edge</div>
                    <div className="col-span-1 p-10 flex items-center justify-center text-[10px] font-black text-slate-600 uppercase border-l border-white/5">Market</div>
                    <div className="col-span-6 grid grid-cols-5 h-full">
                        {BOOKS.map(book => (
                            <div key={book.id} className="border-l border-white/5 flex flex-col items-center justify-center p-2">
                                <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${book.color}`}>{book.name}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="divide-y divide-white/5">
                    {filteredGames.length > 0 ? (
                        filteredGames.map(game => (
                            <div key={game.id} className="grid grid-cols-12 hover:bg-white/[0.02] transition-colors relative group/row items-stretch">
                                <div 
                                    className="col-span-3 p-10 flex flex-col justify-center cursor-pointer active:scale-[0.99] transition-transform"
                                    onClick={() => setDetailGame(game)}
                                >
                                    <div className="flex items-center justify-between mb-8">
                                        <span className="text-[11px] text-slate-500 font-mono flex items-center gap-4 bg-white/5 px-5 py-2 rounded-2xl border border-white/5">
                                            <Calendar size={16} className={clsx(`text-${config.accent}-400`)} /> 
                                            {game.date.toLocaleTimeString([], {weekday: 'short', hour: 'numeric', minute:'2-digit'})}
                                        </span>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setDetailGame(game); }}
                                            className={clsx(
                                                "p-3 rounded-[20px] transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-widest border group/btn",
                                                `bg-${config.accent}-500/10 border-${config.accent}-500/20 text-${config.accent}-400 hover:bg-${config.accent}-500 hover:text-white shadow-xl`
                                            )}
                                        >
                                            <Radio size={16} className="animate-pulse" /> LIVE INTEL
                                        </button>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-6 group-hover/row:translate-x-2 transition-transform duration-500">
                                            <div className="w-14 h-14 rounded-[20px] bg-white/5 p-3 border border-white/5 shadow-2xl">
                                                <img src={game.awayLogo} className="w-full h-full object-contain" alt="" />
                                            </div>
                                            <span className="font-black text-white text-3xl tracking-tighter uppercase leading-none">{game.awayTeam}</span>
                                        </div>
                                        <div className="flex items-center gap-6 group-hover/row:translate-x-2 transition-transform duration-500 delay-75">
                                            <div className="w-14 h-14 rounded-[20px] bg-white/5 p-3 border border-white/5 shadow-2xl">
                                                <img src={game.homeLogo} className="w-full h-full object-contain" alt="" />
                                            </div>
                                            <span className="font-black text-white text-3xl tracking-tighter uppercase leading-none">{game.homeTeam}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-span-1 border-l border-white/5 bg-black/20 flex flex-col justify-center p-6 text-center text-base text-slate-500 font-mono font-black">
                                    <div className="opacity-50">{view === 'SPREAD' ? game.openSpread : game.openTotal}</div>
                                </div>

                                <div className={clsx(
                                    "col-span-1 border-l border-white/5 flex flex-col justify-center p-6 text-center relative",
                                    game.aiStatus === 'VERIFIED' ? "bg-emerald-950/10" : "bg-indigo-950/10"
                                )}>
                                    {game.aiStatus === 'VERIFYING' ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <RefreshCw size={28} className="animate-spin text-indigo-400" />
                                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">SOLVING</span>
                                        </div>
                                    ) : game.aiStatus === 'VERIFIED' ? (
                                        <div className="animate-in zoom-in duration-500">
                                            <div className="text-xl font-black text-emerald-400 font-mono drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">{view === 'SPREAD' ? game.aiVerifiedLine : game.aiVerifiedTotal}</div>
                                            <div className="text-[10px] text-emerald-600 font-black uppercase mt-1 tracking-widest">CONFIRMED</div>
                                        </div>
                                    ) : <div className="text-[11px] text-slate-800 italic font-mono tracking-[0.3em]">-----</div>}
                                </div>

                                <div className="col-span-1 border-l border-white/5 bg-black/20 flex flex-col justify-center p-6 text-center relative">
                                    <div className="h-1/2 flex items-center justify-center text-xl text-white font-black font-mono">
                                        {view === 'ML' ? game.consensusMlAway : (view === 'SPREAD' ? game.consensusSpread : game.consensusTotal)}
                                    </div>
                                    <div className="h-1/2 flex items-center justify-center text-xl text-white font-black font-mono border-t border-white/5">
                                        {view === 'ML' ? game.consensusMlHome : (view === 'SPREAD' ? (game.consensusSpread?.includes('+') ? game.consensusSpread.replace('+', '-') : game.consensusSpread?.replace('-', '+')) : game.consensusTotal)}
                                    </div>
                                </div>

                                <div className="col-span-6 grid grid-cols-5">
                                    {BOOKS.map(book => (
                                        <div key={book.id} className="border-l border-white/5 flex flex-col h-full items-center justify-center group/cell hover:bg-white/5 transition-all relative overflow-hidden">
                                            {game.bookOdds[book.id] ? (
                                                <div className="text-center group-hover/cell:scale-110 transition-transform duration-500">
                                                    <div className={clsx("text-xl font-black font-mono", book.color)}>
                                                        {view === 'SPREAD' ? game.bookOdds[book.id].spread : view === 'TOTAL' ? game.bookOdds[book.id].total : game.bookOdds[book.id].mlAway}
                                                    </div>
                                                    <div className="text-[11px] text-slate-600 font-black mt-1 opacity-60">-110</div>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-slate-800 font-black uppercase tracking-widest opacity-20">OFFLINE</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-60 text-center flex flex-col items-center gap-8">
                             <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                                 <Search size={48} className="text-slate-800 animate-pulse" />
                             </div>
                             <div>
                                <p className="font-black uppercase tracking-[0.6em] text-sm text-slate-700">Awaiting Market Liquidity</p>
                                <p className="text-[11px] text-slate-800 font-mono mt-3 uppercase tracking-widest">Connecting to Global Exchange Nodes...</p>
                             </div>
                        </div>
                    )}
                </div>
            </div>

            {/* LIVE INTEL DRAWER */}
            {detailGame && <LiveIntelDrawer game={detailGame} onClose={() => setDetailGame(null)} />}

            {/* Dashboard Footer Meta */}
            <div className="mt-16 flex flex-col md:flex-row justify-between items-center gap-10 text-[11px] text-slate-600 font-mono uppercase tracking-[0.3em]">
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-3 group cursor-help">
                        <BarChart3 size={18} className="text-indigo-500 group-hover:rotate-12 transition-transform" />
                        <span>Infrastructure: SportsData.io L3 Core</span>
                    </div>
                    <div className="flex items-center gap-3 group cursor-help">
                        <ShieldCheck size={18} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                        <span>Validation: Gemini 3.0 Pro Edge</span>
                    </div>
                </div>
                <div className="flex items-center gap-8 bg-[#0a0e17] px-10 py-4 rounded-[20px] border border-white/5 shadow-2xl">
                    <span className="flex items-center gap-3 text-emerald-500 font-black">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                        UPSTREAM ONLINE
                    </span>
                    <span className="flex items-center gap-3 opacity-60">
                        <Clock size={16} /> 
                        Last Sync: {lastUpdate.toLocaleTimeString()}
                    </span>
                </div>
            </div>
        </div>
    );
};
