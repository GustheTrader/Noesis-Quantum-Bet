// Same-origin proxy for ESPN's public site API, for every league the board shows.
//
// ESPN sends no Access-Control-Allow-Origin header, so the browser cannot read scoreboards
// or summaries directly. AllOrigins worked as a fallback but it is a third party that
// rate-limits and sometimes returns HTML, which is why slates intermittently came up empty.
// This route fetches server-side with an allowlisted sports path and a short edge cache.
//
//   GET /api/espn?path=football/nfl/scoreboard
//   GET /api/espn?path=football/college-football/scoreboard%3Fdates%3D2006
//   GET /api/espn?path=basketball/nba/summary%3Fevent%3D401234567

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports';

/** Sports sections the board renders. Anything else is rejected, so this cannot proxy arbitrary hosts. */
const SPORTS = /^(football|basketball|baseball|hockey|soccer|mma|golf|racing)\/[a-z0-9.-]+$/;

const ENDPOINTS = /^(scoreboard|summary)(\?[A-Za-z0-9=&_.%:-]*)?$/;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.searchParams.get('path') || '';

  const [sportPath, ...rest] = path.split('/');
  const endpoint = rest.join('/');

  if (!SPORTS.test(`${sportPath}/${rest[0]}`) || !ENDPOINTS.test(endpoint.split('/').slice(1).join('/'))) {
    return Response.json({ error: `Unsupported ESPN path: ${path}` }, { status: 400 });
  }

  const target = `${ESPN}/${sportPath}/${endpoint}`;
  try {
    const upstream = await fetch(target, {
      headers: { accept: 'application/json', 'user-agent': 'noesis-quantum-bet/1.0' },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `ESPN fetch failed: ${message}` }, { status: 502 });
  }
}
