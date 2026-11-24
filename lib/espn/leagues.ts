/** ESPN league map (slice 1). Keys are our internal league codes. */
export interface LeagueDef {
  key: LeagueKey;
  sport: string;
  league: string;
  label: string;
}

export type LeagueKey = 'nfl' | 'nba' | 'nhl' | 'mlb';

export const LEAGUES: Record<LeagueKey, LeagueDef> = {
  nfl: { key: 'nfl', sport: 'football', league: 'nfl', label: 'NFL' },
  nba: { key: 'nba', sport: 'basketball', league: 'nba', label: 'NBA' },
  nhl: { key: 'nhl', sport: 'hockey', league: 'nhl', label: 'NHL' },
  mlb: { key: 'mlb', sport: 'baseball', league: 'mlb', label: 'MLB' },
};

export function isLeagueKey(v: string): v is LeagueKey {
  return Object.prototype.hasOwnProperty.call(LEAGUES, v);
}

export function getLeague(key: string): LeagueDef {
  if (!isLeagueKey(key)) throw new Error(`Unknown league: ${key}`);
  return LEAGUES[key];
}
