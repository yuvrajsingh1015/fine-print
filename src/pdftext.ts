/**
 * Tidies text extracted from a PDF so the rules see whole words:
 * words hyphenated at a line end are joined again ("Kündi-\ngung"),
 * and trailing spaces at line ends are removed.
 */
export function cleanPdfText(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/(\p{L})-\n[ \t]*(\p{Ll})/gu, "$1$2");
}

/**
 * Text recognition sometimes starts a new paragraph in the middle of a
 * sentence when the line spacing varies. Blank lines are dropped where the
 * line before does not end a sentence and the next one starts in lower case.
 */
export function joinBrokenParagraphs(text: string): string {
  return text.replace(/([^.!?:\s])[ \t]*\n(?:[ \t]*\n)+[ \t]*(?=\p{Ll})/gu, "$1\n");
}

// "Seite 3 von 9", "Page 3 of 9", also when OCR drops the space ("3von 9")
const PAGE_MARKER = /\b(?:Seite|Page)\s*\d+\s*(?:von|of|\/)\s*\d+\b/i;

/**
 * Removes running page headers and footers ("Arbeitsvertrag für … Seite 3 von 9")
 * so they do not end up inside the sentence that continues on the next page.
 */
export function dropPageMarkers(text: string): string {
  return text
    .split("\n")
    .filter((line) => !(line.length <= 120 && PAGE_MARKER.test(line)))
    .join("\n");
}

/**
 * Letterheads and footers ("Vorstand: …", "Telefon +49 …") repeat on every
 * page. Short lines that show up on most pages are dropped. Digits and
 * punctuation are ignored when comparing, so page numbers do not matter.
 */
export function dropRepeatedLines(pages: string[]): string[] {
  if (pages.length < 3) return pages;
  // single words ("und", "der") repeat everywhere, so only longer lines count
  const key = (line: string) => {
    const k = line.toLowerCase().replace(/[^\p{L}]/gu, "");
    return k.length >= 6 && /\S\s+\S/.test(line.trim()) ? k : "";
  };
  const seen = new Map<string, number>();
  for (const page of pages) {
    const keys = new Set(page.split("\n").filter((l) => l.trim().length <= 100).map(key));
    for (const k of keys) if (k) seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  const limit = Math.max(3, Math.ceil(pages.length / 2));
  return pages.map((page) =>
    page
      .split("\n")
      .filter((line) => line.trim().length > 100 || !key(line) || (seen.get(key(line)) ?? 0) < limit)
      .join("\n"),
  );
}

/**
 * OCR often reads "§" as "8" or "5", so "§ 4 Vergütung" becomes "84 Vergütung".
 * Only short heading lines are touched: an "8"/"5" directly followed by a
 * section number and a capitalised word.
 */
export function fixParagraphSigns(text: string): string {
  return text.replace(/^[ \t]*[85]\s?(\d{1,2})[ \t]+(?=\p{Lu}[^\n]{0,80}$)/gmu, "§ $1 ");
}
