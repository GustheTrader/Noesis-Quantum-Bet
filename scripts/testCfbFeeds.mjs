// Verifies every data path the CFB (2006 season) pages read from, end to end.
//   node scripts/testCfbFeeds.mjs [--season 2006] [--event 263220194]
// Exits non-zero on the first hard failure so a broken feed is loud, not silent.
import fs from 'node:fs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const SEASON = Number(arg('season', 2006));
const EVENTS = [
  arg('event', '263220194'),
  '262450194',
  '263220057',
];
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football';
const PROXIES = [
  (url) => url,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

const results = [];
const ok = (name, detail) => {
  results.push({ name, pass: true, detail });
  console.log(`  PASS  ${name} — ${detail}`);
};
const bad = (name, detail) => {
  results.push({ name, pass: false, detail });
  console.log(`  FAIL  ${name} — ${detail}`);
};

async function espnJson(path) {
  let lastErr = null;
  for (const wrap of PROXIES) {
    try {
      const res = await fetch(wrap(`${ESPN}/${path}`));
      if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

function eventsFrom(data) {
  return data.events || [];
}

function checkShape(events, label) {
  const missing = events.filter((e) => {
    const comp = e.competitions?.[0];
    const comps = comp?.competitors || [];
    const home = comps.find((c) => c.homeAway === 'home');
    const away = comps.find((c) => c.homeAway === 'away');
    const status = e.status?.type || comp?.status?.type;
    return !e.date || !home || !away || !home.team?.id || !away.team?.id || !status?.detail;
  });
  if (missing.length) return bad(label, `${missing.length} events missing date/teams/status`);
  const ids = new Set(events.map((e) => String(e.id)));
  ok(label, `${events.length} events, ${ids.size} unique ids, all with date/teams/status`);
  return events;
}

function archived(games, label) {
  if (!Array.isArray(games) || games.length === 0) return bad(label, 'snapshot empty or missing');
  const dates = games.map((g) => g.date).sort();
  const outside = games.filter((g) => !g.date || g.date.slice(0, 4) > String(SEASON) || g.date.slice(0, 4) < String(SEASON - 1));
  const withLine = games.filter((g) => g.line && (g.line.spread != null || g.line.total != null));
  const weeks = new Set(games.map((g) => g.week));
  const scores = games.filter((g) => Number(g.home.score) >= 0 && Number(g.away.score) >= 0);
  ok(
    label,
    `${games.length} finished games, ${weeks.size} week keys, ${dates[0]} → ${dates.at(-1)}, ` +
      `${scores.length} with scores, ${withLine.length} with any line, ${outside.length} outside season window`,
  );
  return games;
}

console.log(`Noesis CFB feed check — season ${SEASON}\n`);

// 1. Live ESPN scoreboard for a single day inside the season.
console.log('ESPN scoreboard (single day, 2006-11-18):');
try {
  const day = eventsFrom(await espnJson('scoreboard?dates=20061118&limit=800'));
  checkShape(day, 'scoreboard day');
  const osuMich = day.find((e) => e.id === '263220194');
  if (osuMich) ok('known game present', `263220194 = ${osuMich.shortName} at ${osuMich.date}`);
  else bad('known game present', '263220194 (Michigan @ Ohio State) missing from the day query');
} catch (e) {
  bad('scoreboard day', e.message);
}

// 2. Full-season query used by lib/cfb.ts loadSeasonScoreboard().
console.log('\nESPN scoreboard (full season ?dates=YYYY&limit=1000):');
let seasonEvents = [];
try {
  seasonEvents = eventsFrom(await espnJson(`scoreboard?dates=${SEASON}&limit=1000`));
  checkShape(seasonEvents, 'scoreboard season');
  const post = seasonEvents.filter((e) => e.season?.slug === 'post-season').length;
  const reg = seasonEvents.length - post;
  ok('season split', `${reg} regular-season, ${post} post-season events`);
} catch (e) {
  bad('scoreboard season', e.message);
}

// 3. Summary endpoint per game (LiveIntelDrawer + getGameDetail).
console.log('\nESPN summary (play-by-play path):');
for (const id of EVENTS) {
  try {
    const data = await espnJson(`summary?event=${id}`);
    const comp = data.header?.competitions?.[0];
    const drivers = data.drives?.previous || data.drives?.current || [];
    const plays = (Array.isArray(data.plays) && data.plays.length ? data.plays : drivers.flatMap((d) => d.plays || []));
    const scoring = data.scoringPlays || [];
    const linescores = (comp?.competitors || []).map((c) => `${c.team?.abbreviation}:${(c.linescores || []).length}q`);
    if (!comp) {
      bad(`summary ${id}`, 'no header.competitions[0]');
    } else if (!plays.length) {
      bad(`summary ${id}`, 'no plays — drawer would render empty');
    } else {
      const sample = plays[0];
      const shaped = plays.filter((p) => p.text && p.clock?.displayValue && p.period?.number);
      ok(
        `summary ${id}`,
        `${plays.length} plays (${shaped.length} with text/clock/period), ${scoring.length} scoring plays, ` +
          `${data.boxscore?.teams?.length || 0} boxscore teams, quarters ${linescores.join(' ')}, ` +
          `first play "${String(sample.text).slice(0, 48)}…"`,
      );
    }
  } catch (e) {
    bad(`summary ${id}`, e.message);
  }
}

// 4. Committed snapshot used by the static (no-ESPN) board.
console.log('\nCommitted snapshot:');
try {
  const path = new URL(`../src/assets/cfb/${SEASON}.json`, import.meta.url);
  archived(JSON.parse(fs.readFileSync(path, 'utf8')), `src/assets/cfb/${SEASON}.json`);
} catch (e) {
  bad('snapshot file', e.message);
}

// 5. Do the two sources agree on scores?
console.log('\nCross-check snapshot vs ESPN summary:');
try {
  const path = new URL(`../src/assets/cfb/${SEASON}.json`, import.meta.url);
  const snap = JSON.parse(fs.readFileSync(path, 'utf8'));
  for (const id of EVENTS) {
    const row = snap.find((g) => g.id === id);
    if (!row) {
      bad(`cross-check ${id}`, 'game not in snapshot');
      continue;
    }
    const data = await espnJson(`summary?event=${id}`);
    const comp = data.header.competitions[0];
    const home = comp.competitors.find((c) => c.homeAway === 'home');
    const away = comp.competitors.find((c) => c.homeAway === 'away');
    const same = Number(row.home.score) === Number(home.score) && Number(row.away.score) === Number(away.score);
    if (same) ok(`cross-check ${id}`, `${row.away.abr} ${row.away.score} @ ${row.home.abr} ${row.home.score} matches`);
    else bad(`cross-check ${id}`, `snapshot ${row.away.score}-${row.home.score} vs ESPN ${away.score}-${home.score}`);
  }
} catch (e) {
  bad('cross-check', e.message);
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}
