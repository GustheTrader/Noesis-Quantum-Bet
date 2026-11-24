#!/usr/bin/env node
/**
 * Fetch a finished college-football season from ESPN and write it as a local snapshot.
 *
 *   node scripts/snapshotCfb.mjs --season 2006
 *
 * One scoreboard call (?dates=<season>&limit=1000) returns every event of that calendar
 * year, which for 2006 is the 2005 bowls + the 2006 regular season + the 2006-07 bowls
 * (926 games). The output goes to src/assets/cfb/<season>.json and is imported by
 * lib/cfb.ts as the fallback when the browser cannot reach ESPN directly.
 */
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']);
    return acc;
  }, [])
);

const season = Number(args.season || 2006);
const outDir = path.resolve('src/assets/cfb');
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football';

const res = await fetch(`${ESPN}/scoreboard?dates=${season}&limit=1000`);
if (!res.ok) throw new Error(`ESPN ${res.status}`);
const payload = await res.json();
const events = payload.events || [];

const LOGO = (id) => `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`;

const team = (c) => {
  const t = c.team || {};
  return {
    id: String(t.id ?? ''),
    name: t.displayName || t.shortDisplayName || t.name || 'TBD',
    shortName: t.shortDisplayName || t.name || t.abbreviation || 'TBD',
    abr: t.abbreviation || (t.shortDisplayName || '').slice(0, 4).toUpperCase() || 'TBD',
    logo: t.logo || LOGO(String(t.id ?? '0')),
    score: c.score?.displayValue ?? c.score ?? '0',
    winner: !!c.winner,
    linescores: (c.linescores || []).map((l) => (l.value != null ? Number(l.value) : parseInt(l.displayValue || '0', 10) || 0)),
    homeAway: c.homeAway === 'home' ? 'home' : 'away',
  };
};

const weekLabel = (e) => {
  const isPost = e.season?.slug === 'post-season' || e.season?.type === 3;
  const week = e.week?.number ?? 1;
  if (isPost) return `Postseason - Bowl ${week}`;
  return `Week ${week}`;
};

const games = events
  .filter((e) => e.competitions?.[0]?.competitors?.length)
  .map((e) => {
    const comp = e.competitions[0];
    const comps = comp.competitors;
    const home = comps.find((c) => c.homeAway === 'home');
    const away = comps.find((c) => c.homeAway === 'away');
    const odds = (comp.odds || [])[0] || (e.odds || [])[0];
    const st = e.status?.type || {};
    const iso = e.date || comp.date || '';
    return {
      id: String(e.id || comp.id),
      date: iso.slice(0, 10),
      kickoff: iso,
      status: st.detail || st.shortDetail || st.description || 'Scheduled',
      completed: !!st.completed,
      week: weekLabel(e),
      venue: comp.venue?.fullName || '',
      neutralSite: !!comp.neutralSite,
      away: away ? team(away) : team({}),
      home: home ? team(home) : team({}),
      line: odds ? { spread: odds.spread, total: odds.overUnder, provider: odds.provider?.name } : undefined,
    };
  });

// Keep the shape stable for TypeScript: drop keys that came back undefined.
const clean = JSON.parse(JSON.stringify(games));
const finished = clean.filter((g) => g.completed);

fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `${season}.json`);
fs.writeFileSync(out, JSON.stringify(finished));

const withLines = finished.filter((g) => g.line && (g.line.spread != null || g.line.total != null)).length;
const weeks = [...new Set(finished.map((g) => g.week))];
console.log(`${out}: ${finished.length} finished games (${clean.length - finished.length} scheduled/void), ${withLines} with a line, ${weeks.length} week keys`);
