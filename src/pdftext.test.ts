import { describe, expect, it } from "vitest";
import { analyze } from "./analyze";
import { cleanPdfText, joinBrokenParagraphs } from "./pdftext";

describe("cleanPdfText", () => {
  it("joins words split at a line end", () => {
    expect(cleanPdfText("Die Kündi-\ngungsfrist beträgt\ndrei Monate.")).toBe("Die Kündigungsfrist beträgt\ndrei Monate.");
    expect(cleanPdfText("auto-\n  matically renew")).toBe("automatically renew");
  });

  it("keeps real hyphens before capitalised words", () => {
    expect(cleanPdfText("per E-\nMail")).toBe("per E-\nMail");
  });

  it("removes trailing spaces at line ends", () => {
    expect(cleanPdfText("one   \ntwo")).toBe("one\ntwo");
  });

  it("lets rules match words the PDF had split", () => {
    const raw = "Die Mindestlauf-\nzeit beträgt 24 Monate.";
    expect(analyze(raw).some((f) => f.categoryId === "minimum_term")).toBe(false);
    expect(analyze(cleanPdfText(raw)).some((f) => f.categoryId === "minimum_term")).toBe(true);
  });
});

describe("joinBrokenParagraphs", () => {
  it("joins paragraphs split in the middle of a sentence", () => {
    expect(joinBrokenParagraphs("um weitere 6 Monate,\n\nwenn er nicht\n\ngekündigt wird.")).toBe(
      "um weitere 6 Monate,\nwenn er nicht\ngekündigt wird.",
    );
  });

  it("keeps real paragraph breaks", () => {
    const text = "§ 2 Laufzeit\n\nDie Laufzeit beträgt 12 Monate.\n\nder Rest";
    expect(joinBrokenParagraphs(text)).toBe(text);
  });
});
