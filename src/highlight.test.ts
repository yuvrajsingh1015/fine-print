import { describe, expect, it } from "vitest";
import { analyze } from "./analyze";
import { buildSegments } from "./highlight";

describe("buildSegments", () => {
  it("covers the whole text without gaps", () => {
    const text = "Hello. We use cookies. Gerichtsstand ist Berlin. Bye.";
    const segments = buildSegments(text.length, analyze(text));
    expect(segments[0].start).toBe(0);
    expect(segments.at(-1)?.end).toBe(text.length);
    for (let i = 1; i < segments.length; i++) expect(segments[i].start).toBe(segments[i - 1].end);
  });

  it("marks keywords and orders overlapping findings by severity", () => {
    const text = "We may share your data and charge a cancellation fee.";
    const segments = buildSegments(text.length, analyze(text));
    const kw = segments.filter((s) => s.keyword).map((s) => text.slice(s.start, s.end));
    expect(kw).toEqual(["share your data", "cancellation fee"]);
    expect(segments[0].findings.map((f) => f.categoryId)).toEqual(["data_sharing", "fees"]);
  });

  it("returns one plain segment when nothing is found", () => {
    expect(buildSegments(5, [])).toEqual([{ start: 0, end: 5, findings: [], keyword: false }]);
  });
});
