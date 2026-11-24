// Same-origin proxy for ESPN's college football API.
//
// ESPN's site API sends no Access-Control-Allow-Origin header, so the browser cannot read
// the scoreboard or summary directly. This route fetches server-side and returns the JSON
// with a cache header, which is what lib/cfb.ts calls first.
//
//   GET /api/cfb?path=scoreboard
//   GET /api/cfb?path=scoreboard%3Fdates%3D2006%26limit%3D1000
//   GET /api/cfb?path=summary%3Fevent%3D263220194

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football';

// Only the two read endpoints the app uses, and only under the CFB league path.
const ALLOWED = /^(scoreboard|summary)(\?[A-Za-z0-9=&_.%:-]*)?$/;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.searchParams.get('path') || 'scoreboard';

  if (!ALLOWED.test(path)) {
    return Response.json({ error: 'Unsupported path' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${ESPN}/${path}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'noesis-quantum-bet/1.0' },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'content-type': 'application/json',
        // Live weeks move; a finished season does not. 30s is a safe middle.
        'cache-control': 'public, max-age=30, s-maxage=30',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `ESPN fetch failed: ${message}` }, { status: 502 });
  }
}
