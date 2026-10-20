import type { Finding } from "./analyze";
import { CATEGORIES, SEVERITY_RANK } from "./rules";

export interface Segment {
  start: number;
  end: number;
  /** findings covering this piece of text, most important first */
  findings: Finding[];
  /** true if a rule keyword itself sits here */
  keyword: boolean;
}

const ORDER = new Map(CATEGORIES.map((c, i) => [c.id, i]));

/** Cuts the text into pieces so overlapping findings can be rendered as flat marks. */
export function buildSegments(length: number, findings: Finding[]): Segment[] {
  const edges = new Set([0, length]);
  for (const f of findings) {
    edges.add(f.start);
    edges.add(f.end);
    for (const m of f.matches) {
      edges.add(m.start);
      edges.add(m.end);
    }
  }
  const points = [...edges].filter((n) => n >= 0 && n <= length).sort((a, b) => a - b);

  const segments: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const covering = findings
      .filter((f) => f.start <= start && f.end >= end)
      .sort(
        (a, b) =>
          SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
          (ORDER.get(a.categoryId) ?? 0) - (ORDER.get(b.categoryId) ?? 0),
      );
    const keyword = covering.some((f) => f.matches.some((m) => m.start <= start && m.end >= end));
    const last = segments.at(-1);
    // merge neighbours that look the same, keeps the DOM small
    if (
      last &&
      last.keyword === keyword &&
      last.findings.length === covering.length &&
      last.findings.every((f, j) => f === covering[j])
    ) {
      last.end = end;
    } else {
      segments.push({ start, end, findings: covering, keyword });
    }
  }
  return segments;
}
