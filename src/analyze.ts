import {
  CATEGORIES,
  SEVERITY_RANK,
  type CategoryId,
  type Lang,
  type Severity,
} from "./rules";

export type Source = "rules" | "deep";

export interface Range {
  start: number;
  end: number;
}

export interface Finding {
  id: string;
  categoryId: CategoryId;
  severity: Severity;
  source: Source;
  /** highlighted range in the original text */
  start: number;
  end: number;
  /** the exact keyword hits inside the range (rules only) */
  matches: Range[];
  /** the highlighted text with whitespace collapsed */
  quote: string;
  numbers: string[];
  /** deep check brings its own explanation; rule findings use the category's */
  explanation?: Record<Lang, string>;
}

// Words that end with a dot without ending the sentence ("z. B.", "e.g.", "Abs. 2").
const ABBREVIATIONS = new Set([
  "abs", "approx", "art", "bzgl", "bzw", "ca", "co", "corp", "dr", "eg", "etc",
  "evtl", "ff", "gem", "ggf", "ie", "inc", "inkl", "insb", "ltd", "max", "min",
  "mind", "mr", "mrs", "ms", "nr", "no", "sog", "str", "usw", "vgl", "vs", "zzgl",
]);

const BOUNDARY = /[.!?]+["'”“»)]*(?=\s)|\n[ \t]*\n|\n(?=[ \t]*(?:§|\d{1,2}[.)]\s|[-•*–]\s))/g;

// Sentences longer than this are clipped around the match (PDFs without punctuation).
const MAX_SENTENCE = 400;
const CLIP_CONTEXT = 160;

/** Splits text into sentence ranges. Offsets point into the original text. */
export function splitSentences(text: string): Range[] {
  const cuts: number[] = [];
  for (const m of text.matchAll(BOUNDARY)) {
    const i = m.index;
    if (/[.!?]/.test(m[0][0])) {
      const word = /([\p{L}\p{N}]+)$/u.exec(text.slice(Math.max(0, i - 20), i))?.[1] ?? "";
      if (/^\d+$/.test(word) || word.length === 1 || ABBREVIATIONS.has(word.toLowerCase())) {
        continue;
      }
      const next = /\S/.exec(text.slice(i + m[0].length))?.[0] ?? "";
      if (next && next !== next.toUpperCase()) continue;
    }
    cuts.push(i + m[0].length);
  }
  cuts.push(...headingEnds(text), text.length);
  cuts.sort((a, b) => a - b);

  const ranges: Range[] = [];
  let from = 0;
  for (const cut of cuts) {
    const range = trimRange(text, from, cut);
    if (range) ranges.push(range);
    from = cut;
  }
  return ranges;
}

const HEADING = /^(?:§|\d+\.?\s|[IVX]+\.\s|(?:Art(?:icle|ikel)?|Section|Abschnitt|Clause|Ziffer)\s)|^[^\p{Ll}]+$/u;
// inside a paragraph only clearly numbered lines count ("4. Daten", "§ 3 Miete")
const NUMBERED = /^(?:§\s*\d+[a-z]?|\d+(?:\.\d+)*\.|[IVX]+\.)\s+\p{Lu}/u;

/**
 * Short numbered lines that open a paragraph and have no punctuation at the
 * end are headings ("§ 4 Haftung", "2 Cancellation"). They get their own range so they do not merge
 * into the first sentence below them.
 */
function headingEnds(text: string): number[] {
  const ends: number[] = [];
  const lines = text.split("\n");
  let offset = 0;
  let prevBlank = true;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const next = lines[i + 1]?.trim();
    const heading = prevBlank ? HEADING.test(line) : NUMBERED.test(line);
    if (heading && next && line.length <= 60 && !/[.,;:!?-]$/.test(line)) {
      ends.push(offset + lines[i].length);
    }
    prevBlank = !line;
    offset += lines[i].length + 1;
  }
  return ends;
}

/** "§ 5 Kaution" names a topic; the clause itself follows below it. */
function isHeading(part: string): boolean {
  return part.length <= 60 && !/[.,;:!?]$/.test(part) && NUMBERED.test(part.replace(/\s+/g, " ") + " ");
}

function trimRange(text: string, start: number, end: number): Range | null {
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  return end > start ? { start, end } : null;
}

function clip(text: string, sentence: Range, hit: Range): Range {
  if (sentence.end - sentence.start <= MAX_SENTENCE) return sentence;
  let start = Math.max(sentence.start, hit.start - CLIP_CONTEXT);
  let end = Math.min(sentence.end, hit.end + CLIP_CONTEXT);
  // snap to word edges so the excerpt does not start mid-word
  while (start > sentence.start && /\S/.test(text[start - 1])) start--;
  while (end < sentence.end && /\S/.test(text[end])) end++;
  return trimRange(text, start, end) ?? hit;
}

export function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

const NUMBER =
  "(?:\\d+(?:[.,]\\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|" +
  "fourteen|(?:twenty|thirty|forty|fifty|sixty|ninety)(?:-(?:one|two|three|four|five|six|seven|eight|nine))?|" +
  "hundred|ein(?:e[mnr]?)?|zwei|drei|vier|fünf|sechs|sieben|acht|" +
  "neun|zehn|elf|zwölf|vierzehn|dreißig|sechzig|neunzig)";
const UNIT =
  "(?:(?:business|working|calendar) days?|days?|weeks?|months?|years?|" +
  "(?:Werk|Kalender)?tage?n?|Wochen?|Monate?n?|Jahre?n?)";
// "einen weiteren Monat", "one additional month"
const FILLER = "(?:(?:weitere[nrs]?|additional|further|more|full|volle[n]?)\\s+)?";
const DURATION = new RegExp(`(?<![\\p{L}\\p{N}])${NUMBER}(?:\\s*\\(\\d+\\))?[\\s-]+${FILLER}${UNIT}(?![\\p{L}])`, "giu");
const MONEY = new RegExp(
  "(?:€|EUR|\\$|USD|£|CHF)\\s?\\d(?:[\\d.,]*\\d)?|\\d(?:[\\d.,]*\\d)?\\s?(?:€|EUR|Euro|\\$|USD|£|CHF|%|Prozent|percent)(?![\\p{L}])",
  "giu",
);

/** Pulls durations ("30 days", "12 Monate") and amounts ("9,99 €", "5 %") out of a sentence. */
export function extractNumbers(sentence: string): string[] {
  const hits: { at: number; value: string }[] = [];
  for (const re of [DURATION, MONEY]) {
    for (const m of sentence.matchAll(re)) hits.push({ at: m.index, value: collapse(m[0]) });
  }
  hits.sort((a, b) => a.at - b.at);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { value } of hits) {
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(value);
    }
  }
  return out;
}

// How far around a keyword hit numbers still count as belonging to it.
const NUMBER_WINDOW = 50;

/**
 * Numbers close to the keyword hits, so a long sentence does not pull in
 * amounts that belong to a different part of it.
 */
export function numbersNear(text: string, range: Range, hits: Range[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const hit of hits) {
    let start = Math.max(range.start, hit.start - NUMBER_WINDOW);
    let end = Math.min(range.end, hit.end + NUMBER_WINDOW);
    // widen to whole words so "24 Mon|ate" is not cut in half
    while (start > range.start && /\S/.test(text[start - 1])) start--;
    while (end < range.end && /\S/.test(text[end])) end++;
    for (const n of extractNumbers(text.slice(start, end))) {
      if (!seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase());
        out.push(n);
      }
    }
  }
  return out;
}

export function compareFindings(a: Finding, b: Finding): number {
  return a.start - b.start || SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
}

/** Runs every rule over the text. One finding per category and sentence. */
export function analyze(text: string): Finding[] {
  const sentences = splitSentences(text);
  const findings = new Map<string, Finding>();

  // Match per sentence, so a pattern with a gap can never reach into the next one.
  for (const sentence of sentences) {
    const part = text.slice(sentence.start, sentence.end);
    if (isHeading(part)) continue;
    for (const category of CATEGORIES) {
      for (const pattern of category.patterns) {
        for (const m of part.matchAll(pattern)) {
          if (!m[0]) continue;
          const hit = { start: sentence.start + m.index, end: sentence.start + m.index + m[0].length };
          const range = clip(text, sentence, hit);
          const key = `${category.id}:${range.start}`;
          const existing = findings.get(key);
          if (existing) {
            const overlaps = existing.matches.some((r) => hit.start < r.end && r.start < hit.end);
            if (!overlaps) existing.matches.push(hit);
            continue;
          }
          const quote = collapse(text.slice(range.start, range.end));
          findings.set(key, {
            id: `r-${key}`,
            categoryId: category.id,
            severity: category.severity,
            source: "rules",
            start: range.start,
            end: range.end,
            matches: [hit],
            quote,
            numbers: [],
          });
        }
      }
    }
  }

  const list = [...findings.values()];
  for (const f of list) {
    f.matches.sort((a, b) => a.start - b.start);
    f.numbers = numbersNear(text, f, f.matches);
  }
  return list.sort(compareFindings);
}

/** Finds a quote in the text even if line breaks or spacing differ. */
export function locateQuote(text: string, quote: string): Range | null {
  const words = quote
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (words.length === 0) return null;
  const m = new RegExp(words.join("\\s+"), "u").exec(text);
  return m ? { start: m.index, end: m.index + m[0].length } : null;
}
