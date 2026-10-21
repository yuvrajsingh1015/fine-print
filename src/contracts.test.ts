import { describe, expect, it } from "vitest";
import { analyze } from "./analyze";
import type { CategoryId } from "./rules";

// Whole made-up contracts, written separately from the rules, to check how
// the rules hold up on text they were not tuned for sentence by sentence.
const CONTRACTS: Record<string, string> = {
streaming_en: `StreamBox Premium – Subscription Terms

Your membership starts with a 7-day free trial. Unless you cancel before the trial ends, you will be charged $15.99 per month and your membership will continue month-to-month until cancelled.
You can cancel at any time in your account settings; cancellation takes effect at the end of the current billing cycle. No refunds are given for partial months.
We reserve the right to modify subscription plans and pricing from time to time. Any price change will apply to the next billing cycle after notice.
We collect information about what you watch and may use it to show you tailored recommendations and advertisements. We may disclose your information to service providers and business partners.
We may terminate or restrict your use of the service, without compensation or notice, if you violate these terms.
To the fullest extent permitted by law, StreamBox shall not be responsible for any interruption of service.
You agree that any claim will be resolved individually, not as part of any collective proceeding.`,
energie_de: `Stromliefervertrag – Musterstrom AG

1. Vertragslaufzeit
Der Vertrag beginnt mit der Belieferung und hat eine Erstvertragslaufzeit von 12 Monaten. Er verlängert sich danach auf unbestimmte Zeit und ist dann mit einer Frist von einem Monat kündbar.
2. Preise
Der Arbeitspreis beträgt 32,5 ct/kWh, der Grundpreis 11,90 € monatlich. Musterstrom ist berechtigt, die Preise nach billigem Ermessen an veränderte Kosten anzupassen. Über Preisänderungen informieren wir Sie mindestens einen Monat im Voraus in Textform.
3. Abschläge und Mahnung
Für jede Mahnung erheben wir 2,50 €. Bei Zahlungsverzug können Verzugszinsen in gesetzlicher Höhe berechnet werden. Bei Zahlungsrückstand von mehr als 100 € darf die Versorgung nach Androhung unterbrochen werden.
4. Daten
Zur Bonitätsprüfung übermitteln wir Ihre Daten an die SCHUFA Holding AG.
5. Haftung
Bei Versorgungsstörungen haftet Musterstrom nur für Vorsatz und grobe Fahrlässigkeit.
6. Schlussbestimmungen
Es gilt deutsches Recht.`,
miete_de: `Mietvertrag über eine Wohnung (Auszug)

§ 3 Mietzeit
Das Mietverhältnis beginnt am 01.11.2026 und läuft auf unbestimmte Zeit. Beide Parteien verzichten für die Dauer von zwei Jahren auf ihr ordentliches Kündigungsrecht.
§ 4 Miete
Die Miete beträgt monatlich 780 € zuzüglich Betriebskostenvorauszahlung von 180 €. Es wird eine Staffelmiete vereinbart: Die Miete erhöht sich jährlich zum 1. Januar um 25 €.
§ 5 Kaution
Der Mieter leistet eine Kaution in Höhe von drei Nettokaltmieten.
§ 6 Schönheitsreparaturen
Bei Auszug hat der Mieter die Wohnung renoviert zurückzugeben.
§ 7 Tierhaltung
Die Haltung von Hunden und Katzen bedarf der Zustimmung des Vermieters.`,
saas_en: `Cloudly Business – Master Subscription Agreement

Term. This Agreement commences on the Effective Date and continues for an initial period of thirty-six (36) months. Thereafter it shall renew for successive one-year periods unless either party gives written notice of non-renewal at least ninety (90) days before the end of the then-current term.
Fees. Customer shall pay all fees within 30 days of invoice. Overdue amounts accrue interest at 1.5% per month. Cloudly may increase fees upon renewal by up to 7%.
Data. Customer data may be processed by sub-processors located in the United States.
Suspension. Cloudly may suspend access to the Services immediately if any amount is more than 30 days overdue.
Limitation. Cloudly's aggregate liability shall not exceed the fees paid in the twelve (12) months preceding the claim.
Governing Law. This Agreement is governed by the laws of England and Wales and the parties submit to the exclusive jurisdiction of the courts of London.`,
arbeit_de: `Arbeitsvertrag für Aushilfen – Café Beispiel GmbH

§ 1 Beginn und Probezeit
Das Arbeitsverhältnis beginnt am 01.03.2027. Die ersten sechs Monate gelten als Probezeit, in der beide Seiten mit einer Frist von zwei Wochen kündigen können.
§ 2 Arbeitszeit
Die Arbeitszeit wird nach Dienstplan in wechselnden Schichten festgelegt, auch abends, nachts sowie an Sonn- und Feiertagen. Der Mitarbeiter ist verpflichtet, bei betrieblichem Bedarf Überstunden zu leisten. Mit dem Gehalt sind bis zu zehn Überstunden im Monat abgegolten.
§ 3 Vergütung
Der Stundenlohn beträgt 14,00 €. Die Fahrtkostenzulage ist eine freiwillige Leistung und wird unter dem Vorbehalt des Widerrufs gezahlt. Zu viel gezahlte Vergütung ist zurückzuzahlen.
§ 4 Nebentätigkeit
Jede Nebentätigkeit ist dem Arbeitgeber vorher schriftlich anzuzeigen.
§ 5 Arbeitskleidung
Für nicht zurückgegebene Arbeitskleidung werden 25 € vom Lohn einbehalten.
§ 6 Ausschlussfristen
Ansprüche aus dem Arbeitsverhältnis verfallen, wenn sie nicht innerhalb von drei Monaten nach Fälligkeit schriftlich geltend gemacht werden.
§ 7 Beendigung
Nach einer Kündigung kann der Arbeitgeber den Mitarbeiter unter Fortzahlung der Vergütung von der Arbeit freistellen.
§ 8 Daten
Die Lohnabrechnung wird von einem externen Steuerbüro erstellt, an das die dafür nötigen Daten übermittelt werden.`,
neutral_en: `Welcome to the City Library. Members can borrow up to ten books at a time. Our reading room is open from 9 am to 8 pm. Please keep your voice down and enjoy your stay. Children's story time takes place every Saturday.`,
};

const EXPECTED: Record<string, CategoryId[]> = {
  streaming_en: ["auto_renewal", "notice_period", "price_change", "fees", "data_sharing", "tracking", "account_termination", "liability", "arbitration"],
  energie_de: ["minimum_term", "auto_renewal", "notice_period", "price_change", "fees", "account_termination", "data_sharing", "liability"],
  miete_de: ["minimum_term", "price_change", "fees"],
  saas_en: ["minimum_term", "auto_renewal", "notice_period", "fees", "price_change", "data_sharing", "account_termination", "liability", "arbitration"],
  arbeit_de: ["notice_period", "working_time", "price_change", "fees", "side_jobs", "claim_deadline", "account_termination", "data_sharing"],
  neutral_en: [],
};

describe("whole contracts", () => {
  for (const [name, text] of Object.entries(CONTRACTS)) {
    it(`finds the expected categories in ${name}`, () => {
      const found = new Set(analyze(text).map((f) => f.categoryId));
      expect([...found].sort()).toEqual([...EXPECTED[name]].sort());
    });
  }

  it("does not flag a provider disclosing data as account termination", () => {
    const ids = analyze(CONTRACTS.streaming_en)
      .filter((f) => f.categoryId === "account_termination")
      .map((f) => f.quote);
    expect(ids.some((q) => q.includes("disclose"))).toBe(false);
  });

  it("does not report numbered headings as findings", () => {
    expect(analyze(CONTRACTS.miete_de).some((f) => f.quote === "§ 5 Kaution")).toBe(false);
  });
});
