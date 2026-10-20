import type { Lang, Severity } from "./rules";
import type { DeepErrorCode } from "./deepcheck";
import type { PdfErrorCode } from "./pdf";

const en = {
  title: "Fine Print",
  tagline: "Understand the key terms of a contract before you agree to them.",
  privacy:
    "Quick check runs entirely in your browser. Nothing is uploaded or stored. Deep check sends your text to an external service only when you click it; this site does not store it.",
  disclaimer: "Not legal advice. Results are automated and may miss or misflag clauses.",
  scanHeading: "$ scan contract",
  placeholder: "Paste a contract, terms of service or any fine print here…",
  scan: "Scan",
  edit: "Edit text",
  clear: "Clear",
  uploadPdf: "Upload PDF",
  readingPdf: "Reading PDF…",
  dropHint: "or drop a PDF here",
  tryExample: "Try an example",
  characters: (n: number) => `${n.toLocaleString("en")} characters`,
  pdfErrors: {
    not_pdf: "That file is not a PDF.",
    too_large: "That PDF is too large (max. 20 MB).",
    no_text: "This PDF has no text layer, it is probably a scan. Please copy the text in manually.",
    failed: "Could not read this PDF.",
  } satisfies Record<PdfErrorCode, string>,
  summaryHeading: "Summary",
  findingsHeading: "Findings",
  findingsCount: (n: number, c: number) =>
    n === 0
      ? "No clauses flagged."
      : `${n} ${n === 1 ? "finding" : "findings"} in ${c} ${c === 1 ? "category" : "categories"}`,
  notFound: "Not found",
  emptyState: "Paste text or try an example, then press Scan. Findings will appear here.",
  nothingFound:
    "No flagged clauses. That does not mean the contract is fine, the quick check only knows common phrases.",
  showAll: "Show all",
  severity: { high: "high", medium: "medium", low: "low" } satisfies Record<Severity, string>,
  source: { rules: "Rules", deep: "Deep check" },
  deepCheck: "Deep check",
  deepRunning: "Checking…",
  deepDone: "Deep check done",
  deepSummary: "Deep check summary",
  deepAdded: (n: number) =>
    n === 0 ? "No additional clauses found." : `${n} additional ${n === 1 ? "clause" : "clauses"} found.`,
  deepErrors: {
    not_configured: "Deep check is not available right now.",
    too_long: "The text is too long for the deep check (max. 30,000 characters).",
    rate_limited: "Too many deep checks from your connection. Please try again later.",
    unavailable: "The deep check service is not reachable right now. Your quick check results are still shown.",
    invalid: "The deep check returned an unexpected answer. Your quick check results are still shown.",
  } satisfies Record<DeepErrorCode, string>,
  consentTitle: "Send text for a deep check?",
  consentBody: [
    "The deep check sends the text you entered to Google's Gemini API, an external AI service, which analyses it and sends the result back.",
    "This site does not store your text or the result. Neither are logged.",
    "The service currently runs on Google's free tier, where Google may use submitted text to improve its products. Remove names, addresses and other personal details before you continue.",
  ],
  consentAccept: "Send and check",
  cancel: "Cancel",
  close: "Close",
  privacyLink: "Privacy",
  privacyTitle: "Privacy",
  privacyBody: [
    "Quick check: your text and PDFs are processed only in your browser. Nothing is sent to a server, nothing is stored, and there are no cookies, analytics or trackers.",
    "Deep check: only when you click it and confirm, the text is sent through a small server (Cloudflare Workers) to the Google Gemini API and the result is returned to you. The server does not store or log the text. Your IP address is used for a short time to limit requests (max. 10 per hour) and is then deleted automatically.",
    "Your browser only stores your choice of language and theme.",
    "The site is hosted on GitHub Pages. GitHub may log technical access data such as your IP address for security reasons.",
  ],
  footerBack: "yuvrajsingh.de",
  themeToLight: "Switch to light mode",
  themeToDark: "Switch to dark mode",
  langSwitch: "Deutsch",
};

export type Strings = typeof en;

const de: Strings = {
  title: "Fine Print",
  tagline: "Verstehen Sie die wichtigsten Vertragsbedingungen, bevor Sie zustimmen.",
  privacy:
    "Der Schnellcheck läuft vollständig in Ihrem Browser. Nichts wird hochgeladen oder gespeichert. Der Tiefencheck sendet Ihren Text nur dann an einen externen Dienst, wenn Sie ihn anklicken; diese Seite speichert ihn nicht.",
  disclaimer:
    "Keine Rechtsberatung. Die Ergebnisse sind automatisiert und können Klauseln übersehen oder falsch markieren.",
  scanHeading: "$ scan contract",
  placeholder: "Fügen Sie hier einen Vertrag, AGB oder anderes Kleingedrucktes ein…",
  scan: "Prüfen",
  edit: "Text bearbeiten",
  clear: "Leeren",
  uploadPdf: "PDF hochladen",
  readingPdf: "PDF wird gelesen…",
  dropHint: "oder PDF hierher ziehen",
  tryExample: "Beispiel testen",
  characters: (n: number) => `${n.toLocaleString("de")} Zeichen`,
  pdfErrors: {
    not_pdf: "Diese Datei ist kein PDF.",
    too_large: "Dieses PDF ist zu groß (max. 20 MB).",
    no_text: "Dieses PDF enthält keinen Text, vermutlich ist es ein Scan. Bitte kopieren Sie den Text manuell hinein.",
    failed: "Dieses PDF konnte nicht gelesen werden.",
  },
  summaryHeading: "Übersicht",
  findingsHeading: "Funde",
  findingsCount: (n: number, c: number) =>
    n === 0
      ? "Keine Klauseln markiert."
      : `${n} ${n === 1 ? "Fund" : "Funde"} in ${c} ${c === 1 ? "Kategorie" : "Kategorien"}`,
  notFound: "Nicht gefunden",
  emptyState: "Text einfügen oder ein Beispiel wählen, dann auf Prüfen klicken. Die Funde erscheinen hier.",
  nothingFound:
    "Keine Klauseln markiert. Das heißt nicht, dass der Vertrag unbedenklich ist, der Schnellcheck kennt nur gängige Formulierungen.",
  showAll: "Alle zeigen",
  severity: { high: "hoch", medium: "mittel", low: "niedrig" },
  source: { rules: "Regeln", deep: "Tiefencheck" },
  deepCheck: "Tiefencheck",
  deepRunning: "Prüfe…",
  deepDone: "Tiefencheck fertig",
  deepSummary: "Zusammenfassung Tiefencheck",
  deepAdded: (n: number) =>
    n === 0 ? "Keine weiteren Klauseln gefunden." : `${n} weitere ${n === 1 ? "Klausel" : "Klauseln"} gefunden.`,
  deepErrors: {
    not_configured: "Der Tiefencheck ist gerade nicht verfügbar.",
    too_long: "Der Text ist zu lang für den Tiefencheck (max. 30.000 Zeichen).",
    rate_limited: "Zu viele Tiefenchecks von Ihrer Verbindung. Bitte versuchen Sie es später erneut.",
    unavailable:
      "Der Tiefencheck ist gerade nicht erreichbar. Die Ergebnisse des Schnellchecks bleiben sichtbar.",
    invalid:
      "Der Tiefencheck hat eine unerwartete Antwort geliefert. Die Ergebnisse des Schnellchecks bleiben sichtbar.",
  },
  consentTitle: "Text für den Tiefencheck senden?",
  consentBody: [
    "Der Tiefencheck sendet den eingegebenen Text an die Gemini API von Google, einen externen KI-Dienst, der ihn analysiert und das Ergebnis zurückschickt.",
    "Diese Seite speichert weder Ihren Text noch das Ergebnis. Beides wird nicht protokolliert.",
    "Der Dienst läuft derzeit im kostenlosen Tarif von Google, in dem Google eingereichte Texte zur Verbesserung seiner Produkte nutzen kann. Entfernen Sie Namen, Adressen und andere persönliche Angaben, bevor Sie fortfahren.",
  ],
  consentAccept: "Senden und prüfen",
  cancel: "Abbrechen",
  close: "Schließen",
  privacyLink: "Datenschutz",
  privacyTitle: "Datenschutz",
  privacyBody: [
    "Schnellcheck: Ihr Text und Ihre PDFs werden ausschließlich in Ihrem Browser verarbeitet. Nichts wird an einen Server gesendet, nichts gespeichert, und es gibt keine Cookies, Analyse- oder Tracking-Dienste.",
    "Tiefencheck: Nur wenn Sie ihn anklicken und bestätigen, wird der Text über einen kleinen Server (Cloudflare Workers) an die Google Gemini API gesendet und das Ergebnis an Sie zurückgegeben. Der Server speichert oder protokolliert den Text nicht. Ihre IP-Adresse wird kurzzeitig zur Begrenzung der Anfragen (max. 10 pro Stunde) verwendet und danach automatisch gelöscht.",
    "Ihr Browser speichert nur Ihre Wahl von Sprache und Farbschema.",
    "Die Seite wird über GitHub Pages bereitgestellt. GitHub kann aus Sicherheitsgründen technische Zugriffsdaten wie Ihre IP-Adresse protokollieren.",
  ],
  footerBack: "yuvrajsingh.de",
  themeToLight: "Zum hellen Modus wechseln",
  themeToDark: "Zum dunklen Modus wechseln",
  langSwitch: "English",
};

export const STRINGS: Record<Lang, Strings> = { en, de };
