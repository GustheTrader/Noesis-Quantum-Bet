// Same-origin proxy for Novig's public (unsigned) exchange catalog.
//
// Novig sends no CORS headers, so the browser cannot read its catalog directly. This route
// fetches server-side and returns the JSON. Only the unsigned `/v3/public/catalog/*` GETs
// are allowed: everything else on the exchange needs a signed key, and no key ever reaches
// the browser from here.
//
//   GET /api/novig?path=markets%3Fleague%3DNCAAF%26limit%3D2000
//   GET /api/novig?path=events%3Fleague%3DNCAAF
//   GET /api/novig?path=markets%2F%3CmarketId%3E%2Fbook
//
// NOVIG_HOST selects the exchange. Paper (play money) is the default because it needs no
// geolocation check and no key; set NOVIG_HOST=https://api.novig.com to read production.

const DEFAULT_HOST = 'https://api.paper.novig.com';
const ALLOWED_HOSTS = new Set(['https://api.paper.novig.com', 'https://api.novig.com']);
const ALLOWED = /^(markets|events|markets\/[0-9a-f-]{36}\/book)(\?[A-Za-z0-9=&_.%:-]*)?$/;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.searchParams.get('path') || 'markets';
  const host = (process.env.NOVIG_HOST || DEFAULT_HOST).replace(/\/$/, '');

  if (!ALLOWED_HOSTS.has(host)) {
    return Response.json({ error: `NOVIG_HOST not allowed: ${host}` }, { status: 500 });
  }
  if (!ALLOWED.test(path)) {
    return Response.json({ error: 'Unsupported path' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${host}/v3/public/catalog/${path}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'noesis-quantum-bet/1.0' },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=20, s-maxage=20',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Novig fetch failed: ${message}` }, { status: 502 });
  }
}
