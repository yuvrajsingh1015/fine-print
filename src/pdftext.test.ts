import { describe, expect, it } from "vitest";
import { analyze } from "./analyze";
import { cleanPdfText } from "./pdftext";

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
