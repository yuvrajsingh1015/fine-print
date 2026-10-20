import { analyzeContract } from "./gemini";

export interface Env {
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  RATE_LIMIT: KVNamespace;
}

const ALLOWED_ORIGINS = ["https://yuvrajsingh.de", "http://localhost:5173"];
const MAX_CHARS = 30_000;
const MAX_BODY_BYTES = 200_000;
const REQUESTS_PER_HOUR = 10;
const TIMEOUT_MS = 25_000;

function json(body: unknown, status: number, cors: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

// The IP is only kept as a hash, and only until the hour is over.
async function rateLimitKey(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  const hash = [...new Uint8Array(digest).slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const hour = Math.floor(Date.now() / 3_600_000);
  return `rl:${hour}:${hash}`;
}

async function overLimit(env: Env, ip: string): Promise<boolean> {
  const key = await rateLimitKey(ip);
  const count = Number((await env.RATE_LIMIT.get(key)) ?? 0);
  if (count >= REQUESTS_PER_HOUR) return true;
  await env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: 3_700 });
  return false;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    if (!ALLOWED_ORIGINS.includes(origin)) return new Response("Forbidden", { status: 403 });
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);

    if (Number(request.headers.get("Content-Length") ?? 0) > MAX_BODY_BYTES) {
      return json({ error: "too_long" }, 413, cors);
    }

    let text: unknown;
    try {
      text = ((await request.json()) as { text?: unknown }).text;
    } catch {
      return json({ error: "bad_request" }, 400, cors);
    }
    if (typeof text !== "string" || !text.trim()) return json({ error: "bad_request" }, 400, cors);
    if (text.length > MAX_CHARS) return json({ error: "too_long" }, 413, cors);

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    if (await overLimit(env, ip)) return json({ error: "rate_limited" }, 429, cors);

    try {
      const answer = await analyzeContract(text, env.GEMINI_API_KEY, env.GEMINI_MODEL, AbortSignal.timeout(TIMEOUT_MS));
      return json(answer, 200, cors);
    } catch {
      // deliberately no details: nothing about the request ends up in logs
      return json({ error: "unavailable" }, 502, cors);
    }
  },
} satisfies ExportedHandler<Env>;
