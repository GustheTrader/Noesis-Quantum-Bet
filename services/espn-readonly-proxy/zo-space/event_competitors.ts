// zo.space public API route: /api/espn/rest/v1/event_competitors  (generated from services/espn-readonly-proxy/zo-space)
// Thin forwarder to the local espn-readonly proxy (127.0.0.1:8790), which does all validation,
// CORS and rate limiting. Forwards only method, query string, Origin and the client IP; no auth.
// Minimal slice of hono's Context (kept local so the repo needs no hono dependency).
type Context = { req: { method: string; url: string; header(name: string): string | undefined } };

const TABLE = "event_competitors";
const UPSTREAM = "http://127.0.0.1:8790";
const PASS = ["content-type", "content-range", "cache-control", "retry-after", "allow", "x-content-type-options", "referrer-policy", "vary"];

export default async (c: Context) => {
  const method = c.req.method.toUpperCase();
  const u = new URL(c.req.url);
  const headers: Record<string, string> = {};
  const origin = c.req.header("origin");
  if (origin) headers.origin = origin;
  // Cloudflare sets CF-Connecting-IP (clients cannot spoof it); use it alone as the rate-limit identity.
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for")?.split(",").pop()?.trim();
  if (ip) headers["x-forwarded-for"] = ip;
  try {
    // No request body is ever forwarded; the proxy answers 405 to anything but GET/HEAD/OPTIONS.
    const res = await fetch(`${UPSTREAM}/rest/v1/${TABLE}${u.search}`, { method, headers, redirect: "error" });
    const out = new Headers();
    for (const [k, v] of res.headers) if (PASS.includes(k) || k.startsWith("access-control-")) out.set(k, v);
    return new Response(method === "HEAD" || res.status === 204 ? null : await res.text(), { status: res.status, headers: out });
  } catch {
    return new Response('{"error":"upstream unavailable"}', { status: 502, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  }
};
