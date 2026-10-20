import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "./index";
import { toAnswer } from "./gemini";

function memoryKv() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => void store.set(key, value)),
  } as unknown as KVNamespace;
}

const GOOD = {
  summary_en: "Renews yearly.",
  summary_de: "Verlängert sich jährlich.",
  findings: [
    { categoryId: "auto_renewal", severity: "high", quote: "renews yearly", explanation_en: "a", explanation_de: "b" },
  ],
};

function geminiReply(payload: unknown, status = 200) {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }),
    { status },
  );
}

function post(body: unknown, origin = "https://yuvrajsingh.de", ip = "1.2.3.4") {
  return new Request("https://worker.example/", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

let env: Env;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  env = { GEMINI_API_KEY: "test-key", GEMINI_MODEL: "test-model", RATE_LIMIT: memoryKv() };
  fetchMock = vi.fn(async () => geminiReply(GOOD));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe("worker", () => {
  it("forwards the text and returns the parsed answer", async () => {
    const res = await worker.fetch(post({ text: "The plan renews yearly." }), env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://yuvrajsingh.de");
    expect(await res.json()).toEqual(GOOD);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("models/test-model:generateContent");
    expect(init.headers["x-goog-api-key"]).toBe("test-key");
    expect(init.body).toContain("The plan renews yearly.");
  });

  it("answers preflight requests for allowed origins only", async () => {
    const ok = await worker.fetch(new Request("https://w/", { method: "OPTIONS", headers: { Origin: "http://localhost:5173" } }), env);
    expect(ok.status).toBe(204);
    const bad = await worker.fetch(new Request("https://w/", { method: "OPTIONS", headers: { Origin: "https://evil.example" } }), env);
    expect(bad.status).toBe(403);
  });

  it("rejects other origins without calling the provider", async () => {
    const res = await worker.fetch(post({ text: "hi" }, "https://evil.example"), env);
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validates the body", async () => {
    expect((await worker.fetch(post("not json"), env)).status).toBe(400);
    expect((await worker.fetch(post({ text: "  " }), env)).status).toBe(400);
    expect((await worker.fetch(post({ text: "x".repeat(30_001) }), env)).status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("limits each IP to 10 requests per hour", async () => {
    for (let i = 0; i < 10; i++) expect((await worker.fetch(post({ text: "a" }), env)).status).toBe(200);
    expect((await worker.fetch(post({ text: "a" }), env)).status).toBe(429);
    expect((await worker.fetch(post({ text: "a" }, undefined, "5.6.7.8"), env)).status).toBe(200);
  });

  it("stores only a hash of the IP", async () => {
    await worker.fetch(post({ text: "a" }), env);
    const key = (env.RATE_LIMIT.put as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(key).not.toContain("1.2.3.4");
  });

  it("returns 502 when the provider fails or answers garbage", async () => {
    fetchMock.mockResolvedValueOnce(new Response("oops", { status: 500 }));
    expect((await worker.fetch(post({ text: "a" }), env)).status).toBe(502);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{not json" }] } }] })));
    expect((await worker.fetch(post({ text: "a" }), env)).status).toBe(502);
    fetchMock.mockRejectedValueOnce(new Error("timeout"));
    expect((await worker.fetch(post({ text: "a" }), env)).status).toBe(502);
  });
});

describe("toAnswer", () => {
  it("drops malformed findings", () => {
    const answer = toAnswer({
      summary_en: "s",
      findings: [GOOD.findings[0], { categoryId: "nope", severity: "high", quote: "q" }, { categoryId: "fees", severity: "high", quote: " " }, null],
    });
    expect(answer.findings).toHaveLength(1);
    expect(answer.summary_de).toBe("");
  });
});
