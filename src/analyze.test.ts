import { describe, expect, it } from "vitest";
import { analyze, extractNumbers, locateQuote, splitSentences } from "./analyze";
import { CATEGORIES, type CategoryId } from "./rules";

function categoriesIn(text: string): CategoryId[] {
  return [...new Set(analyze(text).map((f) => f.categoryId))];
}

const POSITIVE: Record<CategoryId, { en: string[]; de: string[] }> = {
  auto_renewal: {
    en: [
      "Your subscription will automatically renew at the end of each billing period.",
      "The membership renews automatically for another year.",
      "The agreement is extended by 12 months unless cancelled.",
    ],
    de: [
      "Der Vertrag verlängert sich automatisch um weitere 12 Monate.",
      "Das Abonnement verlängert sich stillschweigend um jeweils einen Monat.",
    ],
  },
  notice_period: {
    en: [
      "Either party may terminate with a notice period of 30 days.",
      "You must give 60 days' written notice before cancelling.",
      "You may cancel at any time, but at least two weeks before the end of the term.",
    ],
    de: [
      "Die Kündigungsfrist beträgt drei Monate zum Ende der Laufzeit.",
      "Sie können mit einer Frist von einem Monat zum Monatsende kündigen.",
      "Eine Kündigung muss spätestens 4 Wochen vor Ablauf erfolgen.",
    ],
  },
  minimum_term: {
    en: [
      "The minimum term of this contract is 24 months.",
      "This is a 12-month contract that starts on activation.",
    ],
    de: [
      "Die Mindestlaufzeit beträgt 24 Monate.",
      "Der Vertrag hat eine Laufzeit von zwölf Monaten.",
    ],
  },
  price_change: {
    en: [
      "We may change our prices at any time with 30 days' notice.",
      "Fees are subject to change.",
      "A price increase will be announced by email.",
    ],
    de: [
      "Wir behalten uns eine Preisanpassung vor.",
      "Der Anbieter ist berechtigt, die Preise jährlich anzupassen.",
      "Eine Preiserhöhung wird sechs Wochen vorher mitgeteilt.",
    ],
  },
  fees: {
    en: [
      "An early termination fee of $150 applies.",
      "A late fee of 5% is charged on overdue invoices.",
      "Breach of this clause results in a penalty.",
    ],
    de: [
      "Für Rücklastschriften erheben wir eine Bearbeitungsgebühr von 15 €.",
      "Bei Verstoß wird eine Vertragsstrafe fällig.",
      "Für die Kartenausgabe fällt eine einmalige Pauschale an.",
    ],
  },
  data_sharing: {
    en: [
      "We may share your personal information with our partners.",
      "Your data is shared with third parties for marketing.",
      "Information may be transferred outside the EEA.",
    ],
    de: [
      "Ihre Daten können an Dritte weitergegeben werden.",
      "Wir arbeiten mit Drittanbietern zusammen.",
      "Die Weitergabe Ihrer Daten erfolgt nur an Partnerunternehmen.",
    ],
  },
  tracking: {
    en: [
      "We use cookies to improve the service.",
      "We use analytics tools to understand how the app is used.",
      "Your data is used for personalised advertising.",
    ],
    de: [
      "Wir setzen Cookies ein.",
      "Ihre Daten werden zu Werbezwecken genutzt.",
      "Zur Webanalyse nutzen wir einen externen Dienst.",
    ],
  },
  arbitration: {
    en: [
      "All disputes will be resolved by binding arbitration.",
      "You agree to waive your right to participate in a class action.",
      "The courts of Delaware have exclusive jurisdiction.",
    ],
    de: [
      "Gerichtsstand ist München.",
      "Streitigkeiten werden vor einem Schiedsgericht entschieden.",
      "Wir sind nicht bereit, an einem Streitbeilegungsverfahren teilzunehmen.",
    ],
  },
  liability: {
    en: [
      "We are not liable for any loss of data.",
      "To the maximum extent permitted by law, we disclaim all warranties.",
      "The service is provided \"as is\".",
    ],
    de: [
      "Wir haften nicht für Schäden durch leichte Fahrlässigkeit.",
      "Eine Haftung für Garderobe ist ausgeschlossen.",
      "Der Betreiber übernimmt keine Haftung für Wertgegenstände.",
    ],
  },
  account_termination: {
    en: [
      "We may suspend or terminate your account at any time.",
      "Your access may be suspended if you break these rules.",
      "We can end the service at our sole discretion.",
    ],
    de: [
      "Bei Verstößen behalten wir uns eine Sperrung des Kontos vor.",
      "Wir können Ihr Konto jederzeit sperren.",
      "Der Anbieter kann den Vertrag fristlos kündigen.",
    ],
  },
};

const NEUTRAL = [
  "Welcome to our gym, we are happy to have you.",
  "The studio is open Monday to Friday from 6 am to 10 pm.",
  "Please bring a towel to every training session.",
  "Our app helps you organise your shopping lists.",
  "Thank you for choosing our service.",
  "Das Studio ist von Montag bis Freitag geöffnet.",
  "Bitte bringen Sie ein Handtuch mit.",
  "Am dritten Tag gibt es eine kostenlose Einführung.",
  "Unsere Trainer helfen Ihnen gerne weiter.",
  "Die App ist auf Deutsch und Englisch verfügbar.",
];

describe("rules", () => {
  it("covers all ten categories", () => {
    expect(CATEGORIES).toHaveLength(10);
    expect(Object.keys(POSITIVE).sort()).toEqual(CATEGORIES.map((c) => c.id).sort());
  });

  for (const category of CATEGORIES) {
    describe(category.id, () => {
      for (const lang of ["en", "de"] as const) {
        for (const sentence of POSITIVE[category.id][lang]) {
          it(`matches (${lang}): ${sentence}`, () => {
            expect(categoriesIn(sentence)).toContain(category.id);
          });
        }
      }
    });
  }

  for (const sentence of NEUTRAL) {
    it(`ignores neutral text: ${sentence}`, () => {
      expect(analyze(sentence)).toEqual([]);
    });
  }

  it("tolerates line breaks from PDFs", () => {
    expect(categoriesIn("The plan will\nautomatically\n   renew each month.")).toContain("auto_renewal");
    expect(categoriesIn("Der Vertrag verlängert\nsich um 12 Monate.")).toContain("auto_renewal");
  });

  it("does not let a pattern reach from a heading into the next sentence", () => {
    const text = "§ 2 Laufzeit und Kündigung\nDer Vertrag läuft 24 Monate.";
    expect(analyze(text).filter((f) => f.categoryId === "notice_period")).toEqual([]);
  });

  it("is case-insensitive", () => {
    expect(categoriesIn("THIS AGREEMENT IS SUBJECT TO ARBITRATION.")).toContain("arbitration");
  });
});

describe("analyze", () => {
  it("returns one finding per category and sentence, sorted by position", () => {
    const text =
      "We use cookies and tracking pixels. Your subscription will automatically renew. Gerichtsstand ist Berlin.";
    const findings = analyze(text);
    expect(findings.map((f) => f.categoryId)).toEqual(["tracking", "auto_renewal", "arbitration"]);
    expect(findings[0].matches.length).toBe(2);
  });

  it("points start/end at the sentence in the original text", () => {
    const text = "Intro text here. We may change our prices.\nThanks.";
    const [f] = analyze(text);
    expect(text.slice(f.start, f.end)).toBe("We may change our prices.");
    expect(f.quote).toBe("We may change our prices.");
    expect(f.source).toBe("rules");
  });

  it("clips very long sentences around the match", () => {
    const filler = "lorem ipsum dolor ".repeat(60);
    const text = `${filler}we may share your data with partners ${filler}`;
    const [f] = analyze(text);
    expect(f.categoryId).toBe("data_sharing");
    expect(f.end - f.start).toBeLessThan(400);
    expect(f.quote).toContain("share your data");
  });

  it("only attaches numbers close to the keyword", () => {
    const text =
      "Members pay 49 € once and 29 € per month for the studio, the sauna and every class, and we may change our prices by up to 5 %.";
    const [f] = analyze(text);
    expect(f.categoryId).toBe("price_change");
    expect(f.numbers).toEqual(["5 %"]);
  });

  it("attaches numbers found in the sentence", () => {
    const [f] = analyze("Die Mindestlaufzeit beträgt 24 Monate zu je 29,90 €.");
    expect(f.numbers).toEqual(["24 Monate", "29,90 €"]);
  });
});

describe("splitSentences", () => {
  const split = (t: string) => splitSentences(t).map((r) => t.slice(r.start, r.end));

  it("splits on sentence ends", () => {
    expect(split("One. Two! Three? Four")).toEqual(["One.", "Two!", "Three?", "Four"]);
  });

  it("keeps abbreviations and dates together", () => {
    expect(split("Es gilt z. B. § 5 Abs. 2 der AGB. Danach am 1. Januar.")).toEqual([
      "Es gilt z. B. § 5 Abs. 2 der AGB.",
      "Danach am 1. Januar.",
    ]);
    expect(split("Fees, e.g. late fees, apply. Next.")).toEqual(["Fees, e.g. late fees, apply.", "Next."]);
  });

  it("keeps headings apart from the paragraph below", () => {
    expect(split("§ 4 Haftung\nDer Betreiber haftet nicht.\nWirklich nicht.\n\nKURZ\nText")).toEqual([
      "§ 4 Haftung",
      "Der Betreiber haftet nicht.",
      "Wirklich nicht.",
      "KURZ",
      "Text",
    ]);
    // a line broken mid-sentence is not a heading
    expect(split("Intro.\nWe may share\nYour data.")).toEqual(["Intro.", "We may share\nYour data."]);
    expect(split("The plan will\nRenew.")).toEqual(["The plan will\nRenew."]);
  });

  it("splits on blank lines and list items", () => {
    expect(split("Heading\n\nBody text\n§ 2 Next\n- item")).toEqual([
      "Heading",
      "Body text",
      "§ 2 Next",
      "- item",
    ]);
  });
});

describe("extractNumbers", () => {
  it("finds durations in English and German", () => {
    expect(extractNumbers("Cancel 30 days before the 12-month term ends.")).toEqual(["30 days", "12-month"]);
    expect(extractNumbers("Kündigung mit einer Frist von drei Monaten, Laufzeit 24 Monate.")).toEqual([
      "drei Monaten",
      "24 Monate",
    ]);
    expect(extractNumbers("within fourteen business days")).toEqual(["fourteen business days"]);
    expect(extractNumbers("um einen weiteren Monat, then one additional year")).toEqual([
      "einen weiteren Monat",
      "one additional year",
    ]);
  });

  it("finds amounts and percentages", () => {
    expect(extractNumbers("Der Beitrag beträgt 9,99 € pro Monat.")).toEqual(["9,99 €"]);
    expect(extractNumbers("A fee of $150 or EUR 20 applies.")).toEqual(["$150", "EUR 20"]);
    expect(extractNumbers("Prices may rise by up to 5 % per year.")).toEqual(["5 %"]);
    expect(extractNumbers("Gebühr: 15 Euro.")).toEqual(["15 Euro"]);
  });

  it("does not treat words that contain number words as numbers", () => {
    expect(extractNumbers("Es gibt keinen Monat ohne Training.")).toEqual([]);
  });

  it("removes duplicates", () => {
    expect(extractNumbers("30 days, then another 30 Days.")).toEqual(["30 days"]);
  });
});

describe("locateQuote", () => {
  it("finds quotes across line breaks and spacing differences", () => {
    const text = "Intro.\nWe may\n  change our prices.";
    const r = locateQuote(text, "We may change our prices.");
    expect(r && text.slice(r.start, r.end)).toBe("We may\n  change our prices.");
  });

  it("returns null when the quote is not in the text", () => {
    expect(locateQuote("Some text.", "Other text")).toBeNull();
    expect(locateQuote("Some text.", "   ")).toBeNull();
  });
});
