import { afterEach, describe, expect, it, vi } from "vitest";
import { analyze } from "./analyze";
import { DeepCheckError, mergeFindings, parseDeepResponse, requestDeepCheck } from "./deepcheck";

const TEXT =
  "Your plan renews every year.\nWe may share usage\ndata with our partners. Disputes go to court in Delaware.";

const RESPONSE = {
  summary_en: "Renewing plan with data sharing.",
  summary_de: "Verlängernder Tarif mit Datenweitergabe.",
  findings: [
    {
      categoryId: "auto_renewal",
      severity: "high",
      quote: "Your plan renews every year.",
      explanation_en: "It renews yearly.",
      explanation_de: "Er verlängert sich jährlich.",
    },
    {
      categoryId: "data_sharing",
      severity: "high",
      quote: "We may share usage data with our partners.",
      explanation_en: "Data goes to partners.",
      explanation_de: "Daten gehen an Partner.",
    },
    { categoryId: "fees", severity: "low", quote: "This sentence was invented.", explanation_en: "x" },
    { categoryId: "made_up", severity: "high", quote: "Your plan renews every year." },
    { categoryId: "arbitration", severity: "extreme", quote: "Disputes go to court in Delaware." },
    { categoryId: "arbitration", severity: "medium", quote: "" },
    "not an object",
  ],
};

describe("parseDeepResponse", () => {
  it("keeps valid findings and locates their quotes in the text", () => {
    const result = parseDeepResponse(RESPONSE, TEXT);
    expect(result.findings.map((f) => f.categoryId)).toEqual(["auto_renewal", "data_sharing"]);
    const sharing = result.findings[1];
    expect(TEXT.slice(sharing.start, sharing.end)).toBe("We may share usage\ndata with our partners.");
    expect(sharing.source).toBe("deep");
    expect(sharing.explanation).toEqual({ en: "Data goes to partners.", de: "Daten gehen an Partner." });
    expect(result.summary.de).toBe("Verlängernder Tarif mit Datenweitergabe.");
  });

  it("drops findings whose quote is not in the text", () => {
    expect(parseDeepResponse(RESPONSE, TEXT).dropped).toBe(1);
  });

  it("falls back to the other language when one explanation is missing", () => {
    const result = parseDeepResponse(
      { findings: [{ categoryId: "auto_renewal", severity: "high", quote: "renews every year", explanation_en: "Yearly." }] },
      TEXT,
    );
    expect(result.findings[0].explanation).toEqual({ en: "Yearly.", de: "Yearly." });
    expect(result.summary).toEqual({ en: "", de: "" });
  });

  it("removes duplicate quotes", () => {
    const f = { categoryId: "auto_renewal", severity: "high", quote: "Your plan renews every year." };
    expect(parseDeepResponse({ findings: [f, f] }, TEXT).findings).toHaveLength(1);
  });

  it("rejects responses without a findings array", () => {
    for (const bad of [null, "text", [], { findings: "nope" }, { summary_en: "only" }]) {
      expect(() => parseDeepResponse(bad, TEXT)).toThrow(DeepCheckError);
    }
  });
});

describe("mergeFindings", () => {
  it("adds new deep findings and skips ones the rules already cover", () => {
    const text = "We may share your data with third parties. Your plan renews every year.";
    const rules = analyze(text);
    const deep = parseDeepResponse(
      {
        findings: [
          { categoryId: "data_sharing", severity: "high", quote: "share your data with third parties" },
          { categoryId: "auto_renewal", severity: "high", quote: "Your plan renews every year." },
        ],
      },
      text,
    ).findings;
    const merged = mergeFindings(rules, deep);
    expect(merged.map((f) => [f.categoryId, f.source])).toEqual([
      ["data_sharing", "rules"],
      ["auto_renewal", "deep"],
    ]);
  });
});

describe("requestDeepCheck", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(response: Partial<Response> | Error) {
    const fn = vi.fn(() => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response)));
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  it("posts the text and parses the answer", async () => {
    const fetchMock = stubFetch({ ok: true, status: 200, json: () => Promise.resolve(RESPONSE) });
    const result = await requestDeepCheck("https://worker.example", TEXT);
    expect(result.findings).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("maps failures to friendly error codes", async () => {
    const cases: [Partial<Response> | Error, string][] = [
      [new TypeError("network down"), "unavailable"],
      [{ ok: false, status: 429 }, "rate_limited"],
      [{ ok: false, status: 413 }, "too_long"],
      [{ ok: false, status: 502 }, "unavailable"],
      [{ ok: true, status: 200, json: () => Promise.reject(new SyntaxError("bad json")) }, "invalid"],
      [{ ok: true, status: 200, json: () => Promise.resolve({ nope: true }) }, "invalid"],
    ];
    for (const [response, code] of cases) {
      stubFetch(response);
      await expect(requestDeepCheck("https://worker.example", TEXT)).rejects.toMatchObject({ code });
    }
  });

  it("does not call the network when not configured or too long", async () => {
    const fetchMock = stubFetch({ ok: true, status: 200 });
    await expect(requestDeepCheck(undefined, TEXT)).rejects.toMatchObject({ code: "not_configured" });
    await expect(requestDeepCheck("https://worker.example", "x".repeat(30_001))).rejects.toMatchObject({
      code: "too_long",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
