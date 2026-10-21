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
 * OCR often reads "§" as "8" or "5", so "§ 4 Vergütung" becomes "84 Vergütung".
 * Only short heading lines are touched: an "8"/"5" directly followed by a
 * section number and a capitalised word.
 */
export function fixParagraphSigns(text: string): string {
  return text.replace(/^[ \t]*[85]\s?(\d{1,2})[ \t]+(?=\p{Lu}[^\n]{0,80}$)/gmu, "§ $1 ");
}
