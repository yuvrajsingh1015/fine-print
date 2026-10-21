import { describe, expect, it } from "vitest";
import { analyze } from "./analyze";
import { cleanPdfText, dropPageMarkers, dropRepeatedLines, fixParagraphSigns, joinBrokenParagraphs } from "./pdftext";

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

describe("dropPageMarkers", () => {
  it("removes running headers with page numbers", () => {
    const text = "die Vertragsstrafe\n( | \\ Arbeitsvertrag für Max Muster Seite 7von 9\nbeträgt einen Monatslohn.";
    expect(dropPageMarkers(text)).toBe("die Vertragsstrafe\nbeträgt einen Monatslohn.");
    expect(dropPageMarkers("Terms\nPage 2 of 5\nmore")).toBe("Terms\nmore");
  });

  it("keeps sentences that only mention a page", () => {
    const text = "Die Preise stehen auf Seite 3 der Preisliste, die Teil dieses Vertrages ist und jederzeit online abrufbar bleibt, auch nach Vertragsende.";
    expect(dropPageMarkers(text)).toBe(text);
  });
});

describe("fixParagraphSigns", () => {
  it("restores § in OCR'd section headings", () => {
    expect(fixParagraphSigns("84 Vergütung\n4.1 Text")).toBe("§ 4 Vergütung\n4.1 Text");
    expect(fixParagraphSigns("811 Verfallfristen")).toBe("§ 11 Verfallfristen");
    expect(fixParagraphSigns("89 Beendigung des Beschäftigungsverhältnisses / Kündigungsfristen")).toBe(
      "§ 9 Beendigung des Beschäftigungsverhältnisses / Kündigungsfristen",
    );
  });

  it("leaves numbers in normal sentences alone", () => {
    expect(fixParagraphSigns("84 Euro werden fällig, wenn der Vertrag vorzeitig endet und der Kunde trotzdem weiter zahlt.")).toBe(
      "84 Euro werden fällig, wenn der Vertrag vorzeitig endet und der Kunde trotzdem weiter zahlt.",
    );
    expect(fixParagraphSigns("4.1 Der Lohn")).toBe("4.1 Der Lohn");
  });
});

describe("dropRepeatedLines", () => {
  it("drops letterhead lines that repeat on most pages", () => {
    const body = ["Miete", "Kaution", "Haftung", "Kündigung"];
    const pages = body.map((b, n) => `Muster GmbH • Postfach ${n}\n${b} gilt.\nTelefon +49 681 920-0`);
    expect(dropRepeatedLines(pages)).toEqual(body.map((b) => `${b} gilt.`));
  });

  it("keeps single words that repeat", () => {
    const pages = ["Miete\nund\nKaution", "Haftung\nund\nZahlung", "Laufzeit\nund\nEnde"];
    expect(dropRepeatedLines(pages)).toEqual(pages);
  });

  it("leaves short documents alone", () => {
    const pages = ["Kopf\nA", "Kopf\nB"];
    expect(dropRepeatedLines(pages)).toEqual(pages);
  });
});
