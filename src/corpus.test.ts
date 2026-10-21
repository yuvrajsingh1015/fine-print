import { describe, expect, it } from "vitest";
import { analyze } from "./analyze";

// Made-up contracts in varied wording. Each paragraph starts with a line
// "#cats: a,b" naming the categories it should be flagged for ("#" = none).
const FILES = import.meta.glob<string>("./corpus/*.txt", { query: "?raw", import: "default", eager: true });

interface Paragraph {
  start: number;
  end: number;
  want: Set<string>;
}

function load(raw: string): { text: string; paragraphs: Paragraph[] } {
  const paragraphs: Paragraph[] = [];
  let text = "";
  for (const block of raw.trim().split(/\n\s*\n/)) {
    const [head, ...rest] = block.split("\n");
    const want = new Set(
      head
        .replace(/^#(cats:)?/, "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
    const body = rest.join("\n");
    if (text) text += "\n\n";
    paragraphs.push({ start: text.length, end: text.length + body.length, want });
    text += body;
  }
  return { text, paragraphs };
}

describe("contract corpus", () => {
  let expected = 0;
  let found = 0;
  let extra = 0;
  const misses: string[] = [];

  for (const [path, raw] of Object.entries(FILES)) {
    const { text, paragraphs } = load(raw);
    const findings = analyze(text);
    for (const p of paragraphs) {
      const got = new Set(findings.filter((f) => f.start < p.end && f.end > p.start).map((f): string => f.categoryId));
      for (const id of p.want) {
        expected++;
        if (got.has(id)) found++;
        else misses.push(`${path} [${id}] ${text.slice(p.start, p.start + 60)}`);
      }
      for (const id of got) if (!p.want.has(id)) extra++;
    }
  }

  it("finds at least 95% of the labelled clauses", () => {
    expect(misses.length / expected, misses.join("\n")).toBeLessThanOrEqual(0.05);
    expect(found).toBeGreaterThan(150);
  });

  it("keeps extra findings rare", () => {
    expect(extra).toBeLessThanOrEqual(15);
  });
});
