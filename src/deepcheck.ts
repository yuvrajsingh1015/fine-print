import { collapse, compareFindings, extractNumbers, locateQuote, type Finding } from "./analyze";
import { CATEGORY_IDS, type CategoryId, type Lang, type Severity } from "./rules";

export const MAX_DEEP_CHARS = 30_000;

export interface DeepResult {
  summary: Record<Lang, string>;
  findings: Finding[];
  /** findings the model returned whose quote is not in the text */
  dropped: number;
}

export type DeepErrorCode = "not_configured" | "too_long" | "rate_limited" | "unavailable" | "invalid";

export class DeepCheckError extends Error {
  code: DeepErrorCode;
  constructor(code: DeepErrorCode) {
    super(code);
    this.code = code;
  }
}

const SEVERITIES: Severity[] = ["high", "medium", "low"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Checks the JSON the worker sent back and turns it into findings.
 * Anything malformed is skipped; quotes that are not in the text are dropped
 * so every finding can be highlighted.
 */
export function parseDeepResponse(data: unknown, text: string): DeepResult {
  if (!isRecord(data) || !Array.isArray(data.findings)) throw new DeepCheckError("invalid");

  const findings: Finding[] = [];
  const seen = new Set<string>();
  let dropped = 0;

  data.findings.forEach((raw, i) => {
    if (!isRecord(raw)) return;
    const categoryId = raw.categoryId as CategoryId;
    const severity = raw.severity as Severity;
    const quote = str(raw.quote);
    if (!CATEGORY_IDS.includes(categoryId) || !SEVERITIES.includes(severity) || !quote) return;

    const range = locateQuote(text, quote);
    if (!range) {
      dropped++;
      return;
    }
    const key = `${categoryId}:${range.start}:${range.end}`;
    if (seen.has(key)) return;
    seen.add(key);

    const en = str(raw.explanation_en);
    const de = str(raw.explanation_de);
    const exact = collapse(text.slice(range.start, range.end));
    findings.push({
      id: `d-${i}-${key}`,
      categoryId,
      severity,
      source: "deep",
      start: range.start,
      end: range.end,
      matches: [],
      quote: exact,
      numbers: extractNumbers(exact),
      explanation: en || de ? { en: en || de, de: de || en } : undefined,
    });
  });

  const summaryEn = str(data.summary_en);
  const summaryDe = str(data.summary_de);
  return {
    summary: { en: summaryEn || summaryDe, de: summaryDe || summaryEn },
    findings: findings.sort(compareFindings),
    dropped,
  };
}

/**
 * Combines rule and deep check findings. A deep finding that covers the same
 * text as a rule finding of the same category is a duplicate and left out.
 */
export function mergeFindings(rules: Finding[], deep: Finding[]): Finding[] {
  const extra = deep.filter(
    (d) =>
      !rules.some(
        (r) => r.categoryId === d.categoryId && d.start >= r.start && d.end <= r.end,
      ),
  );
  return [...rules, ...extra].sort(compareFindings);
}

export async function requestDeepCheck(
  endpoint: string | undefined,
  text: string,
  signal?: AbortSignal,
): Promise<DeepResult> {
  if (!endpoint) throw new DeepCheckError("not_configured");
  if (text.length > MAX_DEEP_CHARS) throw new DeepCheckError("too_long");

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: signal ?? AbortSignal.timeout(45_000),
    });
  } catch {
    throw new DeepCheckError("unavailable");
  }

  if (response.status === 429) throw new DeepCheckError("rate_limited");
  if (response.status === 413) throw new DeepCheckError("too_long");
  if (!response.ok) throw new DeepCheckError("unavailable");

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new DeepCheckError("invalid");
  }
  return parseDeepResponse(data, text);
}
