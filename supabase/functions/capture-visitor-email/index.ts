// capture-visitor-email: the only write path into public.visitor_emails.
// The browser never gets table access; this function calls the service-role-only
// SQL function public.capture_visitor_email, which validates, dedupes and rate-limits.
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = /^https:\/\/(noesis-quantum-bet[a-z0-9-]*\.vercel\.app|([a-z0-9-]+\.)?quantumbets\.[a-z]+)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED_ORIGIN.test(origin) ? origin : "null",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

const json = (status: number, body: unknown, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, origin);
  if (origin && !ALLOWED_ORIGIN.test(origin)) return json(403, { error: "origin_not_allowed" }, origin);
  if (Number(req.headers.get("content-length") ?? "0") > 1024) return json(413, { error: "too_large" }, origin);

  let email = "";
  try {
    const body = await req.json();
    email = typeof body?.email === "string" ? body.email : "";
  } catch {
    return json(400, { error: "invalid" }, origin);
  }
  if (!email || email.length > 254) return json(400, { error: "invalid" }, origin);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipHash = await sha256(`qb-visitor-email:${ip}`);

  const { data, error } = await admin.rpc("capture_visitor_email", { p_email: email, p_ip_hash: ipHash });
  if (error) return json(500, { error: "unavailable" }, origin);
  if (data === "invalid") return json(400, { error: "invalid" }, origin);
  if (data === "rate_limited") return json(429, { error: "rate_limited" }, origin);
  return json(200, { ok: true }, origin);
});
