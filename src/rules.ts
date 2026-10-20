export type Lang = "en" | "de";
export type Severity = "high" | "medium" | "low";

export type CategoryId =
  | "auto_renewal"
  | "notice_period"
  | "minimum_term"
  | "price_change"
  | "fees"
  | "data_sharing"
  | "tracking"
  | "arbitration"
  | "liability"
  | "account_termination";

export interface Category {
  id: CategoryId;
  label: Record<Lang, string>;
  color: string;
  severity: Severity;
  explanation: Record<Lang, string>;
  patterns: RegExp[];
}

// Gap that may span line breaks (PDF text) but never leaves the sentence.
const GAP = "[^.!?]{0,60}?";

/**
 * Builds a case-insensitive, unicode-aware pattern. Spaces in the source
 * match any run of whitespace, so phrases still match when a PDF breaks the
 * line in the middle. "~" stands for a short gap inside the same sentence.
 * A leading "\b" is replaced by a lookbehind, because JS word boundaries do
 * not know umlauts.
 */
function p(source: string): RegExp {
  const body = source
    .replace(/^\\b/, "(?<![\\p{L}\\p{N}])")
    .replaceAll("~", GAP)
    .replaceAll(" ", "\\s+");
  return new RegExp(body, "giu");
}

export const CATEGORIES: Category[] = [
  {
    id: "auto_renewal",
    label: { en: "Auto-renewal", de: "Automatische Verlängerung" },
    color: "#fb7185",
    severity: "high",
    explanation: {
      en: "The contract continues and keeps costing money unless you cancel in time.",
      de: "Der Vertrag läuft weiter und kostet weiter Geld, wenn Sie nicht rechtzeitig kündigen.",
    },
    patterns: [
      p("\\bautomatic(?:ally)? renew"),
      p("\\bauto-? ?renew"),
      p("\\brenews? (?:itself )?automatically"),
      p("\\b(?:is|be|are) (?:automatically )?(?:extended|renewed) (?:for|by)"),
      p("\\brecurring (?:billing|payments?|charges?)"),
      p("\\buntil (?:you )?cancel"),
      p("verlängert sich"),
      p("\\bstillschweigend"),
      p("automatische[nr]? Verlängerung"),
      p("\\bVerlängerung um"),
    ],
  },
  {
    id: "notice_period",
    label: { en: "Notice period", de: "Kündigungsfrist" },
    color: "#fb923c",
    severity: "medium",
    explanation: {
      en: "You have to cancel a certain time in advance, otherwise the cancellation only counts later.",
      de: "Sie müssen eine bestimmte Zeit vorher kündigen, sonst wirkt die Kündigung erst später.",
    },
    patterns: [
      p("\\bnotice period"),
      p("\\b(?:days?|weeks?|months?)['’]? (?:prior |advance |written )*notice"),
      p("\\bnotice of (?:cancell?ation|termination)"),
      p("\\bcancel~(?:at least|no later than|in advance|prior to|before the end)"),
      p("kündigungsfrist"),
      p("\\bkündig~(?:Monat|Woche|Tag)"),
      p("\\b(?:Monate?n?|Wochen?|Tage?n?) (?:vor|zum) (?:Ablauf|Ende)"),
      p("\\bFrist von \\S+ (?:Monat|Woche|Tag)"),
    ],
  },
  {
    id: "minimum_term",
    label: { en: "Minimum term", de: "Mindestlaufzeit" },
    color: "#facc15",
    severity: "medium",
    explanation: {
      en: "You are bound to the contract for a fixed period and usually cannot leave earlier.",
      de: "Sie sind für einen festen Zeitraum gebunden und können meist nicht früher aussteigen.",
    },
    patterns: [
      p("\\bminimum (?:contract )?(?:term|period|duration)"),
      p("\\binitial (?:contract )?term"),
      p("\\bfixed term"),
      p("\\b(?:term|commitment) of \\S+ (?:months?|years?)"),
      p("\\b\\d+[- ](?:month|year) (?:contract|commitment|term|plan)"),
      p("mindest(?:vertrags)?(?:laufzeit|dauer)"),
      p("\\berstlaufzeit"),
      p("\\b(?:feste|anfängliche)n? Laufzeit"),
      p("\\bLaufzeit von \\S+ (?:Monat|Jahr)"),
    ],
  },
  {
    id: "price_change",
    label: { en: "Price changes", de: "Preisänderungen" },
    color: "#f87171",
    severity: "high",
    explanation: {
      en: "The provider can raise the price during the contract.",
      de: "Der Anbieter kann den Preis während der Laufzeit erhöhen.",
    },
    patterns: [
      p("\\bprice (?:increase|change|adjustment)s?"),
      p("\\b(?:change|adjust|increase|modify|raise) (?:the |our |its |any )?(?:prices?|fees?|rates?|charges?|subscription fees?)"),
      p("\\b(?:prices?|fees?|rates?) (?:may|can|will|are subject to) (?:be )?(?:change|increase|adjust)"),
      p("preis(?:anpassung|erhöhung|änderung)"),
      p("beitrags(?:anpassung|erhöhung)"),
      p("\\b(?:Preise|Entgelte|Gebühren|Beiträge)~(?:anzupassen|anpassen|erhöhen|zu ändern|ändern)"),
      p("\\bAnpassung der (?:Preise|Entgelte|Gebühren|Beiträge)"),
    ],
  },
  {
    id: "fees",
    label: { en: "Fees & penalties", de: "Gebühren & Strafen" },
    color: "#c084fc",
    severity: "medium",
    explanation: {
      en: "Extra costs can apply on top of the regular price, for example when you cancel or pay late.",
      de: "Zusätzlich zum normalen Preis können Kosten anfallen, etwa bei Kündigung oder Zahlungsverzug.",
    },
    patterns: [
      p("\\b(?:cancell?ation|termination|early termination|late|administrative|admin|processing|activation|set-?up|reactivation|joining|enrollment|enrolment) fees?"),
      p("\\bpenalt(?:y|ies)"),
      p("\\bliquidated damages"),
      p("\\badditional charges?"),
      p("gebühr"),
      p("vertragsstrafe"),
      p("säumniszuschlag"),
      p("verzugszinsen"),
      p("pauschale"),
      p("bearbeitungsentgelt"),
    ],
  },
  {
    id: "data_sharing",
    label: { en: "Data sharing", de: "Datenweitergabe" },
    color: "#38bdf8",
    severity: "high",
    explanation: {
      en: "Your personal data can be passed on to other companies.",
      de: "Ihre persönlichen Daten können an andere Unternehmen weitergegeben werden.",
    },
    patterns: [
      p("\\bthird[- ]part(?:y|ies)"),
      p("\\b(?:share|disclose|sell|transfer|provide) (?:your |such )?(?:personal )?(?:data|information)"),
      p("\\b(?:data|information) (?:is |are |may be |can be |will be )(?:shared|disclosed|sold|transferred)"),
      p("\\boutside (?:the )?(?:EU|EEA|European (?:Union|Economic Area))"),
      p("\\b(?:an|gegenüber|von|mit) Dritte[n]?(?![\\p{L}])"),
      p("drittanbieter"),
      p("\\bdritt(?:unternehmen|parteien|länder|staaten|land)"),
      p("\\bweiter(?:ge)?geben"),
      p("\\bweitergabe"),
      p("\\b(?:Daten|Informationen)~(?:übermittel|übertragen|offengelegt|verkauft)"),
      p("\\bübermittlung~Daten"),
    ],
  },
  {
    id: "tracking",
    label: { en: "Tracking & cookies", de: "Tracking & Cookies" },
    color: "#a3e635",
    severity: "low",
    explanation: {
      en: "Your behaviour can be tracked, for example for analytics or advertising.",
      de: "Ihr Verhalten kann verfolgt werden, etwa für Analysen oder Werbung.",
    },
    patterns: [
      p("\\bcookies?"),
      p("\\btracking"),
      p("\\btrack (?:your|user)"),
      p("\\bweb beacons?"),
      p("\\b(?:pixel tags?|tracking pixels?)"),
      p("\\banalytics"),
      p("\\b(?:targeted|personali[sz]ed|interest-based|behaviou?ral) (?:advertising|ads|marketing)"),
      p("\\badvertising purposes"),
      p("\\bprofiling"),
      p("webanalyse"),
      p("\\banalyse(?:zweck|tool|dienst|-tool|-dienst)"),
      p("\\bAnalyse (?:des|Ihres) (?:Nutzungs|Surf)verhaltens"),
      p("nutzungsverhalten"),
      p("werbezweck"),
      p("\\bpersonalisierte[nr]? Werbung"),
      p("profilbildung"),
      p("nutzerprofil"),
      p("reichweitenmessung"),
    ],
  },
  {
    id: "arbitration",
    label: { en: "Arbitration & legal waivers", de: "Schiedsverfahren & Rechtsverzicht" },
    color: "#818cf8",
    severity: "high",
    explanation: {
      en: "Your options to go to court can be limited or moved to a place that suits the provider.",
      de: "Ihre Möglichkeiten, vor Gericht zu gehen, können eingeschränkt oder an einen für den Anbieter günstigen Ort verlegt werden.",
    },
    patterns: [
      p("\\barbitrat(?:ion|or)"),
      p("\\bclass[- ]action"),
      p("\\bwaive"),
      p("\\bjury trial"),
      p("\\bexclusive (?:jurisdiction|venue)"),
      p("schiedsgericht"),
      p("schiedsverfahren"),
      p("\\bschlichtung"),
      p("streitbeilegung"),
      p("gerichtsstand"),
      p("sammelklage"),
      p("\\bverzicht~(?:Recht|Klage|Anspr)"),
      p("\\bausschließlich zuständig"),
    ],
  },
  {
    id: "liability",
    label: { en: "Liability limits", de: "Haftungsbeschränkung" },
    color: "#34d399",
    severity: "medium",
    explanation: {
      en: "The provider limits what it has to pay for if something goes wrong.",
      de: "Der Anbieter begrenzt, wofür er haftet, wenn etwas schiefgeht.",
    },
    patterns: [
      p("\\bnot (?:be )?(?:held )?(?:liable|responsible)"),
      p("\\bno liability"),
      p("\\blimitation of liability"),
      p("\\bliability~(?:is|shall be|will be) (?:limited|excluded)"),
      p("\\b(?:limit|exclude|disclaim)s? (?:our |its |all |any )?(?:liability|warranties)"),
      p("\\bin no event shall"),
      p("\\bprovided (?:on an )?[\"“']?as[- ]is"),
      p("haftungs(?:ausschluss|beschränkung|begrenzung)"),
      p("\\bhafte[nt]?~nicht"),
      p("\\bkeine Haftung"),
      p("\\bHaftung~(?:ausgeschlossen|beschränkt|begrenzt)"),
      p("\\bübernimmt keine (?:Gewähr|Haftung)"),
      p("\\bohne Gewähr"),
    ],
  },
  {
    id: "account_termination",
    label: { en: "Account termination", de: "Kontosperrung" },
    color: "#e879f9",
    severity: "high",
    explanation: {
      en: "The provider can suspend or end your account, sometimes without warning or reason.",
      de: "Der Anbieter kann Ihr Konto sperren oder beenden, teils ohne Vorwarnung oder Grund.",
    },
    patterns: [
      p("\\b(?:we|us|company|provider)~(?:suspend|terminate|block|disable|close|deactivate|delete)\\w* (?:your |the )?(?:account|access)"),
      p("\\b(?:account|access)~(?:may|can|will) be (?:suspended|terminated|blocked|disabled|closed|deleted)"),
      p("\\bat (?:our|its) (?:sole |absolute )?discretion"),
      p("\\bwithout (?:prior )?(?:notice|warning)"),
      p("\\bfor any reason or no reason"),
      p("\\bsperrung"),
      p("\\b(?:wir|Anbieter|Betreiber)~(?:sperren|löschen|deaktivieren)"),
      p("\\bjederzeit~(?:sperren|löschen|deaktivieren)"),
      p("\\b(?:Konto|Zugang|Account)~(?:gesperrt|gelöscht|deaktiviert)"),
      p("\\bfristlos"),
      p("\\bohne (?:vorherige )?(?:Ankündigung|Vorankündigung|Angabe von Gründen)"),
      p("\\bnach (?:eigenem|freiem) Ermessen"),
    ],
  },
];

export const CATEGORY_BY_ID = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
