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
