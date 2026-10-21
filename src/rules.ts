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
  | "account_termination"
  | "claim_deadline"
  | "working_time"
  | "side_jobs";

export interface Category {
  id: CategoryId;
  label: Record<Lang, string>;
  color: string;
  severity: Severity;
  explanation: Record<Lang, string>;
  patterns: Pattern[];
}

/** A rule pattern; `severity` overrides the category's for this pattern only. */
export type Pattern = RegExp & { severity?: Severity };

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

/** A pattern for wording that is common and usually harmless, reported as low. */
function soft(source: string): Pattern {
  return Object.assign(p(source), { severity: "low" as const });
}

// Number words that can stand before a period ("einem Monat", "drei Wochen").
const COUNT = "(?:\\d+|eine[mn]?|zwei|drei|vier|sechs|acht|zwölf)";

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
      p("\\bfree trial"),
      p("\\bmonth-to-month"),
      p("\\brenew~(?:successive|additional|further|subsequent)"),
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
      p("\\bnotice of (?:cancell?ation|termination|non-renewal)"),
      p("\\bcancell?ation~(?:takes effect|effective)~end of"),
      p("\\b(?:at least|no later than)~(?:days?|weeks?|months?)\\)? (?:before|prior to)"),
      p("\\bcancel~(?:at least|no later than|in advance|prior to|before the end)"),
      p("kündigungsfrist\\w* (?:beträgt|betragen|von|richte|gilt|gelten|im|für|nach|bei)"),
      p("\\b(?:mit|unter Einhaltung) (?:einer|der) (?:Kündigungs)?frist"),
      p(`\\bkündig(?!ungsschutz)~${COUNT} (?:Monat|Woche|Tag)`),
      p("\\b(?:Monate?n?|Wochen?|Tage?n?) (?:vor|zum) (?:Ablauf|Ende)"),
      // not the deadline for suing ("Klage … innerhalb einer Frist von drei Wochen")
      p("(?<!klage[^.!?]{0,150})(?<![\\p{L}])Frist von \\S+ (?:Monat|Woche|Tag)"),
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
      p("\\binitial (?:contract )?(?:term|period)"),
      p("\\bfixed term"),
      p("\\b(?:term|commitment) of \\S+ (?:months?|years?)"),
      p("\\b\\d+[- ](?:month|year) (?:contract|commitment|term|plan)"),
      p("mindest(?:vertrags)?(?:laufzeit|dauer)"),
      p("erst(?:vertrags)?laufzeit"),
      p("\\b(?:feste|anfängliche)n? Laufzeit"),
      p("laufzeit von \\S+ (?:Monat|Jahr)"),
      p("kündigungsverzicht"),
      p("\\bverzicht~(?:ordentliche[ns]? )?Kündigungsrecht"),
      p("\\bKündigungsrecht~(?:ausgeschlossen|verzicht)"),
    ],
  },
  {
    id: "price_change",
    label: { en: "Price & pay changes", de: "Preis- & Lohnänderungen" },
    color: "#f87171",
    severity: "high",
    explanation: {
      en: "What you pay or get paid can change during the contract, without a new agreement.",
      de: "Was Sie zahlen oder bekommen, kann sich während der Laufzeit ohne neue Vereinbarung ändern.",
    },
    patterns: [
      p("\\bprice (?:increase|change|adjustment)s?"),
      p("\\b(?:change|adjust|increase|modify|raise|revise)~(?:prices?|pricing|fees?|rates?|charges?)"),
      p("\\b(?:prices?|fees?|rates?) (?:may|can|will|are subject to) (?:be )?(?:change|increase|adjust)"),
      p("preis(?:anpassung|erhöhung|änderung)"),
      p("beitrags(?:anpassung|erhöhung)"),
      p("\\b(?:Preise|Entgelte|Gebühren|Beiträge)~(?:anzupassen|anpassen|erhöhen|zu ändern|ändern)"),
      p("\\bAnpassung der (?:Preise|Entgelte|Gebühren|Beiträge)"),
      p("staffelmiete"),
      p("indexmiete"),
      p("\\b(?:Miete|Preis|Preise|Beitrag|Entgelt|Grundgebühr)~erhöht sich"),
      // employment: pay that can be withdrawn, reduced or offset
      p("widerrufsvorbehalt|\\bVorbehalt des Widerrufs|freiwilligkeitsvorbehalt"),
      p("\\b(?:zu )?widerrufen"),
      p("\\bfreiwillig~(?:kein|ohne)~Anspruch"),
      p("\\bbetriebliche[rn]? Übung"),
      p("\\b(?:zu )?kürzen(?![\\p{L}])|\\bKürzung"),
      p("\\bwerden~verrechnet"),
      p("\\b(?:may|can) (?:withdraw|reduce|revoke|cancel)~(?:pay|bonus|allowance|salary|benefit)"),
    ],
  },
  {
    id: "fees",
    label: { en: "Fees & penalties", de: "Gebühren & Strafen" },
    color: "#c084fc",
    severity: "medium",
    explanation: {
      en: "Extra costs, penalties or deductions can apply, for example when you cancel, pay late or break a rule.",
      de: "Zusätzliche Kosten, Strafen oder Abzüge können anfallen, etwa bei Kündigung, Zahlungsverzug oder Regelverstoß.",
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
      p("\\bno refunds?"),
      p("\\bnon-refundable"),
      p("\\b(?:accrue|bear|charge) interest"),
      p("\\binterest (?:at|of) \\d"),
      p("\\bsecurity deposit"),
      p("\\bkaution"),
      p("\\b(?:Mahnung|Rücklastschrift|Entsperrung)~(?:€|EUR|Euro|\\d)"),
      p("\\beinbehalten"),
      p("\\bKosten~(?:zu tragen|trägt|tragen)"),
      p("\\b(?:bear|pay) (?:the|all|any) costs?"),
      p("\\baufrechn|\\baufzurechnen"),
      p("\\bzurückzu(?:zahlen|erstatten)|\\brückzahlung|\\brepay"),
      p("\\bWegfall der Bereicherung"),
      p("\\bdeduct~(?:from your|wages|salary|pay)"),
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
      p("\\bsub-?processors?"),
      p("\\b(?:transferred|processed|stored)~(?:United States|USA|third countr)"),
      p("\\bcredit (?:reference|reporting) agenc"),
      p("\\b(?:SCHUFA|Auskunftei)"),
      p("\\bexterne~Stelle"),
      p("steuerberater|\\bLohnbüro|\\b(?:Dienstleister|Auftragsverarbeiter)"),
      p("\\bKrankenkasse ab(?![\\p{L}])"),
      p("\\b(?:payroll|service) providers?"),
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
      p("\\b(?:tailored|targeted|relevant|personali[sz]ed)~(?:ads|advertis)"),
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
      p("\\bcollective (?:proceeding|action|arbitration)"),
      p("\\brepresentative action"),
      p("\\bon an individual basis|\\bresolved individually"),
      soft("\\bgoverned by the laws? of"),
      p("schiedsgericht"),
      p("schiedsverfahren"),
      soft("\\bschlichtung"),
      soft("streitbeilegung"),
      soft("gerichtsstand"),
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
      p("\\bliability~(?:shall|will|may) not exceed"),
      p("\\b(?:aggregate|total|maximum) liability"),
      p("\\bliable only (?:for|in)"),
      p("\\bprovided (?:on an )?[\"“']?as[- ]is"),
      p("haftungs(?:ausschluss|beschränkung|begrenzung)"),
      p("\\bhafte[nt]?~nicht"),
      p("\\bkeine Haftung"),
      p("\\bhafte[nt]?~nur"),
      p("\\bHaftung~(?:ausgeschlossen|beschränkt|begrenzt)"),
      p("\\bübernimmt keine (?:Gewähr|Haftung)"),
      p("\\bohne Gewähr"),
    ],
  },
  {
    id: "account_termination",
    label: { en: "Suspension & termination", de: "Sperrung & Beendigung" },
    color: "#e879f9",
    severity: "high",
    explanation: {
      en: "The other side can suspend you, release you from work or end the contract, sometimes without warning.",
      de: "Die Gegenseite kann Sie sperren, freistellen oder den Vertrag beenden, teils ohne Vorwarnung.",
    },
    patterns: [
      p("\\b(?:we|us|company|provider)~(?<![\\p{L}])(?:suspend|terminate|restrict|block|disable|close|deactivate|delete)\\w*~(?:account|access|use|service)"),
      p("\\b(?:account|access)~(?:may|can|will) be (?:suspended|terminated|blocked|disabled|closed|deleted)"),
      p("\\bat (?:our|its) (?:sole |absolute )?discretion"),
      p("(?<!\\b(?:you|customer|user)\\s)\\bmay (?:immediately |at any time )?(?:suspend|terminate|restrict|block|disable|deactivate)~(?:account|access|use|service)"),
      p("\\bwithout (?:prior )?(?:\\w+ (?:or|and) )?(?:notice|warning)"),
      p("\\bfor any reason or no reason"),
      p("\\bsperrung"),
      p("\\b(?:wir|Anbieter|Betreiber)~(?:sperren|löschen|deaktivieren)"),
      p("\\bjederzeit~(?:sperren|löschen|deaktivieren)"),
      p("\\b(?:Konto|Zugang|Account)~(?:gesperrt|gelöscht|deaktiviert)"),
      p("\\bfristlos"),
      p("\\bohne (?:vorherige )?(?:Ankündigung|Vorankündigung|Angabe von Gründen)"),
      p("\\bnach (?:eigenem|freiem) Ermessen"),
      p("\\bfreistell|\\bfreizustellen"),
      p("\\bohne dass es einer Kündigung bedarf"),
      p("\\bgarden leave|\\brelease~from (?:work|duties)"),
      p("\\b(?:Versorgung|Belieferung|Lieferung|Leistung|Dienst|Zugang|Anschluss)~(?:unterbrochen|eingestellt|gesperrt)"),
    ],
  },
  {
    id: "claim_deadline",
    label: { en: "Claim deadlines", de: "Ausschlussfristen" },
    color: "#f59e0b",
    severity: "high",
    explanation: {
      en: "Your claims (for example unpaid wages) expire if you do not raise them within a short deadline.",
      de: "Ihre Ansprüche (etwa offener Lohn) verfallen, wenn Sie sie nicht innerhalb einer kurzen Frist geltend machen.",
    },
    patterns: [
      p("ausschlussfrist"),
      p("verfallfrist"),
      p("\\bAnsprüche~(?:verfallen|erlöschen|geltend (?:zu )?mach|geltend gemacht)"),
      p("\\bverfallen(?![\\p{L}])"),
      p("\\bGeltendmachung~(?:Ansprüch|Frist|innerhalb)"),
      p("klagefrist"),
      p("\\bKündigungsschutzklage~(?:Frist|innerhalb)"),
      p("\\bclaims?~(?:must|shall) be (?:made|brought|filed|asserted|raised|submitted) within"),
      p("\\btime-barred|\\bforfeit"),
    ],
  },
  {
    id: "working_time",
    label: { en: "Hours, shifts & duties", de: "Arbeitszeit, Schichten & Einsatz" },
    color: "#94a3b8",
    severity: "medium",
    explanation: {
      en: "You can be asked to work overtime, nights, weekends or other duties and places, often at short notice.",
      de: "Sie können zu Überstunden, Nacht- oder Wochenendarbeit oder anderen Aufgaben und Orten eingeteilt werden, oft kurzfristig.",
    },
    patterns: [
      p("mehrarbeit|überstunden"),
      p("\\bovertime"),
      p("\\bwechselnde[nr]? Schichten|schichtarbeit|schichtdienst"),
      p("\\b(?:shift work|rotating shifts)"),
      p("\\bnachts(?![\\p{L}])|nachtarbeit|\\bnight (?:work|shifts?)"),
      p("\\bSonn- und Feiertag|\\ban Sonn|\\bon (?:weekends|Sundays|public holidays)"),
      p("jahresarbeitszeit|arbeitszeitkonto|\\bannuali[sz]ed hours"),
      p("rufbereitschaft|bereitschaftsdienst|\\bon[- ]call"),
      p("\\babgegolten"),
      p("\\bandere[n]? (?:gleichwertige|zumutbare)~Tätigkeit|\\bandere[n]? Betriebsstätte|\\bversetz"),
      p("\\b(?:other|different) (?:duties|locations?|sites?)|\\breassign"),
      p("\\bDienstplan~(?:bindend|vom Arbeitgeber)"),
    ],
  },
  {
    id: "side_jobs",
    label: { en: "Side jobs & competition", de: "Nebentätigkeit & Wettbewerb" },
    color: "#2dd4bf",
    severity: "medium",
    explanation: {
      en: "Other jobs or competing work can be restricted or must be reported to the employer.",
      de: "Andere Jobs oder Konkurrenztätigkeiten können eingeschränkt sein oder müssen gemeldet werden.",
    },
    patterns: [
      p("nebentätigkeit|nebenbeschäftigung"),
      p("\\bweitere[nr]? (?:Einkünfte|Beschäftigungsverhältnis)"),
      p("\\banderweitige~Tätigkeit"),
      p("wettbewerbsverbot|konkurrenztätigkeit"),
      p("\\bnon-compet"),
      p("\\b(?:secondary|outside|other) employment"),
    ],
  },
];

export const CATEGORY_BY_ID = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
