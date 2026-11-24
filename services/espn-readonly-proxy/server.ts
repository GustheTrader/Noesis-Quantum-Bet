/**
 * espn-readonly-proxy HTTP server (node:http; runs under bun or node >= 18).
 *
 * Env:
 *   PORT / HOST       listen address (default 127.0.0.1:8790; Zo's edge terminates TLS)
 *   UPSTREAM_URL      local PostgREST base (default http://127.0.0.1:3300), NOT the Kong/envoy gateway
 *   ALLOWED_ORIGINS   comma-separated CORS origins, or * (default *)
 *   RATE_LIMIT_PER_MIN per client IP, IPv6 per /64 (default 120); GLOBAL_RATE_LIMIT_PER_MIN (default 3000)
 *   Client IP = right-most X-Forwarded-For hop; the zo.space forwarder sets it from Cloudflare's CF-Connecting-IP.
 * Holds no secrets: upstream requests carry no Authorization, so PostgREST uses its anon role.
 */
import http from 'node:http';
import { PASS_RESPONSE_HEADERS, RateLimiter, clientIp, corsHeaders, decide } from './proxy.ts';

const PORT = Number(process.env.PORT ?? 8790);
const HOST = process.env.HOST ?? '127.0.0.1';
const UPSTREAM = (process.env.UPSTREAM_URL ?? 'http://127.0.0.1:3300').replace(/\/+$/, '');
const ORIGINS = (process.env.ALLOWED_ORIGINS ?? '*').split(',').map((s) => s.trim()).filter(Boolean);
const limiter = new RateLimiter(Number(process.env.RATE_LIMIT_PER_MIN ?? 120), 60_000);
// Backstop across all clients (rotating-IP floods); generous vs. normal app traffic.
const globalLimiter = new RateLimiter(Number(process.env.GLOBAL_RATE_LIMIT_PER_MIN ?? 3000), 60_000);
const UPSTREAM_TIMEOUT_MS = 10_000;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'public, max-age=15',
};

function send(res: http.ServerResponse, status: number, headers: Record<string, string>, body?: string) {
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const t0 = Date.now();
  const raw = req.url ?? '/';
  const qi = raw.indexOf('?');
  const path = qi < 0 ? raw : raw.slice(0, qi);
  const search = qi < 0 ? '' : raw.slice(qi);
  const method = req.method ?? 'GET';
  const cors = corsHeaders(typeof req.headers.origin === 'string' ? req.headers.origin : undefined, ORIGINS);
  const ip = clientIp(req.headers['x-forwarded-for'] as string | undefined, req.socket.remoteAddress);
  let status = 500;
  try {
    const d = decide(method, path, search);
    if (d.kind === 'preflight') {
      status = 204;
      return send(res, 204, cors);
    }
    const wait = Math.max(limiter.check(ip), globalLimiter.check('*'));
    if (wait > 0) {
      status = 429;
      return send(res, 429, { ...cors, 'Content-Type': 'application/json', 'Retry-After': String(wait) }, JSON.stringify({ error: 'rate limited' }));
    }
    if (d.kind === 'health') {
      status = 200;
      return send(res, 200, { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, '{"ok":true}');
    }
    if (d.kind === 'reject') {
      status = d.status;
      const extra: Record<string, string> = d.status === 405 ? { Allow: 'GET, HEAD, OPTIONS' } : {};
      return send(res, d.status, { ...cors, ...extra, 'Content-Type': 'application/json' }, JSON.stringify({ error: d.error }));
    }
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), UPSTREAM_TIMEOUT_MS);
    let up: Response;
    try {
      up = await fetch(UPSTREAM + d.upstreamPath, { method: method === 'HEAD' ? 'HEAD' : 'GET', headers: d.headers, signal: ac.signal, redirect: 'error' });
    } finally {
      clearTimeout(timer);
    }
    const body = method === 'HEAD' ? '' : await up.text();
    status = up.ok ? up.status : up.status >= 500 ? 502 : up.status;
    const h: Record<string, string> = { ...cors };
    for (const name of PASS_RESPONSE_HEADERS) {
      const v = up.headers.get(name);
      if (v) h[name] = v;
    }
    // Upstream errors are passed through only as a generic message (no SQL/hint details).
    if (!up.ok) return send(res, status, { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, JSON.stringify({ error: `upstream ${up.status}` }));
    return send(res, status, h, body);
  } catch {
    status = 502;
    return send(res, 502, { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, '{"error":"upstream unavailable"}');
  } finally {
    // Path only (no query, no headers): nothing sensitive is ever logged.
    console.log(`${new Date().toISOString()} ${method} ${path.slice(0, 80)} ${status} ${Date.now() - t0}ms`);
  }
});

server.listen(PORT, HOST, () => console.log(`espn-readonly-proxy listening on ${HOST}:${PORT} -> ${UPSTREAM}`));
