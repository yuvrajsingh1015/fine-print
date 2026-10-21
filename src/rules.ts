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
// a dot inside "12.500" or "z.B." does not end the gap
const GAP = "(?:[^.!?]|\\.(?=\\S)){0,60}?";

/**
 * Builds a case-insensitive, unicode-aware pattern. Spaces in the source
 * match any run of whitespace, so phrases still match when a PDF breaks the
 * line in the middle. "~" stands for a short gap inside the same sentence.
 * A leading "\b" is replaced by a lookbehind, because JS word boundaries do
 * not know umlauts.
 */
// Scanned PDFs often come with a text layer that lost its umlauts
// ("Kundigung", "zuruckzuzahlen", "ausschlieBlich"), so every umlaut in a
// pattern also accepts the plain letter.
const UMLAUT: Record<string, string> = { ä: "äa", ö: "öo", ü: "üu", Ä: "ÄA", Ö: "ÖO", Ü: "ÜU" };

function looseUmlauts(source: string): string {
  let out = "";
  let inClass = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === "\\") {
      out += c + (source[++i] ?? "");
      continue;
    }
    if (c === "[") inClass = true;
    else if (c === "]") inClass = false;
    if (c in UMLAUT) out += inClass ? UMLAUT[c] : `[${UMLAUT[c]}]`;
    else if (c === "ß" && !inClass) out += "(?:ß|ss|B)";
    else out += c;
  }
  return out;
}

function p(source: string): RegExp {
  const body = looseUmlauts(source)
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
      p("\\bläuft~weiter|\\bweiterläuft"),
      p("\\berneuer\\p{L}* sich|\\bverlängert sich|\\bwird~verlängert"),
      p("\\bsetzt sich~fort|\\bwird fortgesetzt|\\bsolange Sie~nicht (?:kündigen|beenden)"),
      p("\\bbilled every|\\bturn off (?:auto-?)?renewal|\\buntil you turn off"),
      p("\\brolls? over|\\brolling over|\\bsubscription is continuous|\\brenew(?:s|ed)? at the end"),
      p("\\bautomatisch~(?:kostenpflichtig|verlängert|fortgesetzt|weiter)"),
      p("probe(?:monat|abo|zeitraum|phase)|\\btest(?:phase|zeitraum|monat)|\\bgratismonat"),
      p("\\bcontinue~until (?:terminated|cancell?ed|you cancel)"),
      p("\\bautomatically~(?:charg|bill|continu|convert)"),
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
      p("(?<!\\bupon[^.!?]{0,25})(?<![\\p{L}])(?:days?|weeks?|months?)(?:['’]s?|s['’])? (?:prior |advance |written )*notice"),
      p("\\bnotice of (?:cancell?ation|termination|non-renewal)"),
      p("\\bcancell?ation~(?:takes effect|effective)~end of"),
      p("\\b(?:at least|no later than|no less than|not less than)~(?:days?|weeks?|months?)\\)? (?:before|prior to)"),
      p("\\b(?:cancel|terminate)~end of (?:the|your) (?:current )?(?:billing|subscription|membership) (?:period|cycle|term)"),
      p("\\bcancel~at any time"),
      p("\\bspätestens~vor (?:Ende|Ablauf|Beginn)"),
      p("\\bbefore (?:your|the) next (?:billing|renewal|payment) date"),
      p("\\bgesetzlichen (?:Kündigungs)?fristen"),
      p("\\bzum Ende des (?:laufenden )?(?:Abrechnungszeitraums|Monats|Kalendermonats|Vertragsjahres|Abrechnungsmonats)~kündig"),
      p("\\bkündig~zum Ende des (?:laufenden )?(?:Abrechnungszeitraums|Monats|Kalendermonats|Vertragsjahres|Abrechnungsmonats)"),
      p("\\bcancel~(?:at least|no later than|in advance|prior to|before the end)"),
      p("kündigungsfrist\\w* (?:beträgt|betragen|von|richte|gilt|gelten|im|für|nach|bei)"),
      p("\\b(?:mit|unter Einhaltung) (?:einer|der) (?:Kündigungs)?frist(?![^.!?]{0,40}(?:angekündigt|mitgeteilt|informier))"),
      p(`\\bkündig(?!ungsschutz)~${COUNT} (?:Monat|Woche|Tag)\\p{L}{0,2}(?![\\p{L}])`),
      p("\\b(?:Monate?n?|Wochen?|Tage?n?) (?:vor|zum) (?:Ablauf|Ende)"),
      // not the deadline for suing ("Klage … innerhalb einer Frist von drei Wochen")
      p("(?<!(?:klage|Anspr|geltend)[^.!?]{0,150})(?<![\\p{L}])Frist von \\S+ (?:Monat|Woche|Tag)(?![^.!?]{0,40}(?:angekündigt|mitgeteilt|informier))"),
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
      p("\\binitial (?:contract )?(?:term|period|commitment)"),
      p("\\bfixed term"),
      p("\\b(?:term|commitment) of \\S+(?: \\(\\d+\\))?(?: consecutive| full| calendar)? (?:months?|years?)"),
      p("\\b(?:lease|rental) term~(?:begins|ends|expires|of)"),
      p("\\bbefristet|\\bbefristung|\\bvertragsdauer"),
      p("\\bverzicht[^.!?]{0,120}(?:ordentliche[n]? Kündigung|Kündigungsrecht)"),
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
    label: { en: "Price, pay & terms changes", de: "Preis-, Lohn- & Vertragsänderungen" },
    color: "#f87171",
    severity: "high",
    explanation: {
      en: "What you pay, what you get paid or the terms themselves can change during the contract without a new agreement.",
      de: "Was Sie zahlen oder bekommen oder die Bedingungen selbst können sich während der Laufzeit ohne neue Vereinbarung ändern.",
    },
    patterns: [
      p("\\bprice (?:increase|change|adjustment)s?"),
      p("\\b(?:change|adjust|increase|modify|raise|revise)~(?:prices?|pricing|fees?|rates?|charges?|dues|rent)(?![\\p{L}])"),
      p("\\b(?:update|modify|change|amend|revise)~(?:these|the|our) (?:Terms|agreement|conditions|policies)"),
      p("\\bcontinued use~(?:constitutes|means|deemed|acceptance)"),
      p("\\b(?:bonus|allowance|benefit|commission)\\w*~(?:discretionary|may be (?:withdrawn|varied|reduced|changed))"),
      p("\\bdoes not (?:create|give rise to) (?:an |any )?(?:entitlement|right)"),
      p("\\b(?:standard|then[- ]current|regular|full) (?:rate|price)|\\brate in effect|\\bintroduce new (?:fees|charges|prices)"),
      p("\\bmay (?:introduce, )?(?:vary|withdraw|change)~(?:discount|benefit|allowance|bonus|perk)"),
      p("\\b(?:Steuern|Abgaben|Umlagen|Netzentgelte)~(?:weiter(?:ge)?geben|weitergeben|gibt~weiter)|\\bgibt~Änderungen~weiter"),
      p("\\b(?:anzuheben|anheben)|\\bbilligem Ermessen"),
      p("\\b(?:Prämie|Bonus|Zulage|Sonderzahlung|Gratifikation)\\p{L}*~(?:eingestellt|widerrufen|gestrichen|Ermessen|freiwillig)"),
      p("\\b(?:prices?|fees?|rates?) (?:may|can|will|are subject to) (?:be )?(?:change|increase|adjust)"),
      p("preis(?:anpassung|erhöhung|änderung)"),
      p("beitrags(?:anpassung|erhöhung)"),
      p("(?:preis|entgelt|gebühr|beitr[aä]g|miete)\\p{L}*~(?:anzupassen|anpassen|zu erhöhen|erhöhen|zu ändern|ändern)(?![\\p{L}])"),
      p("\\b(?:Nutzungsbedingungen|Bedingungen|AGB|Geschäftsbedingungen)~(?:zu ändern|ändern|anzupassen|anpassen)"),
      p("\\bgelten~als (?:genehmigt|angenommen|akzeptiert)|\\bgilt~als Zustimmung"),
      p("\\bAnpassung der (?:Preise|Entgelte|Gebühren|Beiträge)"),
      p("staffelmiete"),
      p("indexmiete"),
      p("\\b(?:Miete|Preis|Preise|Beitrag|Entgelt|Grundgebühr)~erhöht sich"),
      // employment: pay that can be withdrawn, reduced or offset
      p("widerrufsvorbehalt|\\bVorbehalt des Widerrufs|freiwilligkeitsvorbehalt"),
      p("\\b(?:zu )?widerrufen"),
      p("\\bfreiwillig~(?:kein|ohne)~Anspruch"),
      p("\\bbetriebliche[rn]? [ÜO]bung"),
      p("\\bKurzarbeit~(?:anzuordnen|anordnen)|\\bvermindern sich~(?:Arbeitsentgelt|Entgelt|Vergütung)"),
      p("\\babbedungen|\\bnicht zur Aufrechterhaltung des Vergütungsanspruchs"),
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
      p("\\b(?:cancell?ation|termination|early termination|late|administrative|admin|processing|activation|set-?up|reactivation|joining|enrollment|enrolment|maintenance|annual|service|cleaning|replacement|attorney['’]?s?['’]?|legal) (?:fees?|charges?)"),
      p("\\b(?:fee|charge) of (?:\\$|€|£|USD|EUR)?\\s?\\d"),
      p("\\bbuyout|\\bremaining (?:monthly )?(?:dues|payments|balance)|\\bcosts? of collection|\\bcollection costs"),
      p("\\b(?:berechne[nt]?|erheben|erhoben|in Rechnung)~\\d[\\d.,]*\\s?(?:€|EUR|Euro)|\\d[\\d.,]*\\s?(?:€|EUR|Euro)~(?:berechnet|erhoben|in Rechnung)"),
      p("\\beinmalige[nr]?~(?:preis|entgelt|betrag)"),
      p("\\bsofort (?:zur Zahlung )?fällig|\\bimmediately due|\\bacceleration"),
      p("\\bnicht (?:zurück)?erstattet|\\bkeine (?:Rück)?erstattung|\\bnot be refunded"),
      p("\\bcannot be refunded|\\bnon-?refundable|\\bpurchases are final|\\bare final and"),
      p("\\brecover\\w*~from your (?:wages|pay|salary)"),
      p("(?<![\\p{L}])(?:Rück)?versandkosten|\\bKosten der Rücksendung"),
      p("zuschlag|\\bauf (?:dessen|seine|ihre|Ihre|eigene) Kosten|\\bat your (?:own )?(?:cost|expense)"),
      p("\\bcharged (?:an additional|the difference|extra|for (?:any|each|every))"),
      p("\\bresponsible for (?:all |any )?(?:damage|tolls|fines|costs|charges|losses)"),
      p("\\bhaftet~(?:für (?:den|alle|entstandene)~Schäd|Schaden)|\\bverrechnen(?![\\p{L}])|\\bverrechnung"),
      p("\\b(?:trägt|tragen|übernimmt|übernehmen) (?:der Mieter |der Kunde |der Arbeitnehmer |Sie )?die Kosten"),
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
      p("\\bWegfall der Bereicherung|\\bEinwand der Entreicherung"),
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
      p("steuerberater|\\bLohnbüro|dienstleister|auftragsverarbeiter"),
      p("\\bübermittel\\p{L}*~(?:Ihre |Ihren |personenbezogene |die )?Daten"),
      p("\\b(?:affiliates|affiliated \\w+|marketing partners|business partners|group companies)"),
      p("\\bKrankenkasse ab(?![\\p{L}])"),
      p("\\b(?:payroll|service) providers?"),
      p("(?<!(?:Abtretung|Verpfändung|abgetreten)[^.!?]{0,80})(?<![\\p{L}])(?:an|gegenüber|von|mit) Dritte[n]?(?![\\p{L}])"),
      p("drittanbieter"),
      p("\\bdritt(?:unternehmen|parteien|länder|staaten|land)"),
      p("\\bweiter(?:ge)?geben"),
      p("\\bweitergabe"),
      p("(?:daten|informationen)~(?:übermittel|übertragen|offengelegt|verkauft|ausgetauscht)"),
      p("datenaustausch|\\btauscht~Daten"),
      p("\\b(?:geben|gibt)~(?:Daten|Bestelldaten|Ihre Daten)~weiter|\\bweitergeleitet|\\bweiterleit"),
      p("\\bmade available to (?:partners|third|others)|\\bavailable to~partners"),
      p("\\b(?:disclose|provide|pass on|give)~(?:details|your name|name, address|licen[cs]e information|contact)"),
      p("\\bcollection agenc|\\blaw enforcement|\\bcompanies within our group|\\bour providers"),
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
      p("\\bvideo(?:überwach|kamera)|\\bvideo (?:cameras?|surveillance)|\\bCCTV"),
      p("\\b(?:Verkehrs|Standort|Nutzungs)daten|marketingzweck"),
      p("\\b(?:Seh|Surf|Kauf|Hör)verhalten"),
      p("\\b(?:telemetry|usage data)"),
      p("\\bmonitor~(?:use|email|internet|activity|communications|calls)"),
      p("\\banaly[sz]e~(?:what you|your (?:use|activity|behaviou?r))"),
      p("\\bpersonali[sz]ed promotions"),
      p("\\bGPS|\\btelematic|\\blocation data|\\bdevice identifiers|\\bhow you interact"),
      p("\\bscans?~(?:your device|processes|files)|\\banti-cheat"),
      p("\\bPixel|\\b(?:geöffnet|opened) ha(?:ben|t)|\\bmessen~ob Sie"),
      p("interessenprofil|\\bprofil\\p{L}*~erstell|\\berstell\\p{L}*~profil"),
      p("überwach|protokolldaten|\\bkontrolliere?n?~(?:E-Mail|Konten|Nutzung|Protokoll)"),
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
      p("\\bclass (?:member|proceeding|or representative)|\\bcourts? located in|\\bheard exclusively|\\bexclusively in the~courts"),
      soft("\\bsubject to the laws? of"),
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
      p("\\bin no event (?:shall|will)"),
      p("\\breleases?~from (?:any and all |all |any )?(?:claims|liability)"),
      p("\\bassumes? (?:all |any )?(?:the )?risks?"),
      p("\\bliability~(?:shall|will|may) not exceed"),
      p("\\b(?:aggregate|total|maximum) liability"),
      p("\\bliable only (?:for|in)"),
      p("\\bprovided (?:on an )?[\"“']?as[- ]is"),
      p("haftungs(?:ausschluss|beschränkung|begrenzung)"),
      p("\\bhafte[nt]?~nicht"),
      p("\\bkeine Haftung"),
      p("\\bhafte[nt]?~nur"),
      p("\\bHaftung~(?:ausgeschlossen|beschränkt|begrenzt)"),
      p("\\bkeine (?:Gewähr|Gewährleistung)"),
      p("\\bkeine(?:rlei)? Verantwortung|\\bnicht versichert|\\bausgeschlossen sind|\\bAusschlüsse"),
      p("\\b(?:liability|responsibility)~is limited to"),
      p("\\bstellen? keinen Mangel dar|\\bkein Mangel"),
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
      p("(?<!\\b(?:you|customer|user|member|tenant|employee|party)\\s)\\bmay (?:immediately |at any time )?(?:suspend|terminate|restrict|block|disable|deactivate|revoke)~(?:account|access|use|service|membership|privileges|lease|agreement|contract|tenancy)"),
      p("\\bwithout (?:prior )?(?:\\w+ (?:or|and) )?(?:notice|warning)"),
      p("\\bfor any reason or no reason"),
      p("\\bsperrung"),
      p("\\b(?:wir|Anbieter|Betreiber)~(?:sperren|löschen|deaktivieren)"),
      p("\\bjederzeit~(?:sperren|löschen|deaktivieren)"),
      p("\\b(?:Konto|Zugang|Account)~(?:gesperrt|gelöscht|deaktiviert)"),
      p("\\bfristlos|hausverbot|\\baußerordentlich~kündig"),
      p("\\breserves? the right to (?:cancel|terminate|suspend|remove|delete|close|refuse)"),
      p("\\b(?:we|us) (?:may|can|will) (?:delete|remove|repossess|cancel|terminate|suspend|close|end)(?![\\p{L}])"),
      p("\\b(?:ban|suspend)~(?:players|users|members|you)(?![\\p{L}])|\\bmay suspend you"),
      p("\\b(?:schließen|einzustellen|einstellen|kündigen)(?![\\p{L}])~(?:jederzeit|ohne)|\\bjederzeit (?:zu )?schließen|\\b(?:Belieferung|Versorgung|Lieferung)~einzustellen"),
      p("\\bohne (?:Vorwarnung|Einhaltung einer Frist)|\\bleistungsfrei|\\bvon der Verpflichtung zur Leistung frei"),
      p("\\b(?:entfernen|löschen|sperren|kündigen)~ohne"),
      p("\\bberechtigt~(?:zu )?(?:sperren|deaktivieren)|\\bzu sperren|\\bgesperrt"),
      p("\\bohne (?:vorherige )?(?:Ankündigung|Vorankündigung|Angabe von Gründen)"),
      p("\\bnach (?:eigenem|freiem) Ermessen"),
      p("\\bfreistell|\\bfreizustellen"),
      p("\\bohne,? dass es einer Kündigung bedarf|\\bendet~ohne Kündigung"),
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
      p("\\b(?:verfallen|verfällt)(?![\\p{L}])"),
      p("\\binnerhalb[^.!?]{0,100}geltend (?:zu )?(?:machen|gemacht)|\\beinzuklagen"),
      p("\\bGeltendmachung~(?:Ansprüch|Frist|innerhalb)"),
      p("klagefrist"),
      p("\\bKündigungsschutzklage~(?:Frist|innerhalb)"),
      p("\\bclaims?~(?:must|shall) be (?:made|brought|filed|asserted|raised|submitted) within"),
      p("\\btime-barred|\\bforfeit"),
      p("\\bbinnen~(?:geltend|erhoben|schriftlich)|\\bAnsprüche~ausgeschlossen"),
      p("\\binnerhalb~anzuzeigen"),
      p("\\b(?:must|shall) (?:be )?(?:report|notif)\\w*~within"),
      p("\\b(?:grievance|claim|complaint|query)~(?:must|should|shall) be raised~within"),
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
      p("mehrarbeit|[üo]berstunden"),
      p("\\bovertime"),
      p("\\bwechselnde[nr]? Schichten|schichtarbeit|schichtdienst"),
      p("\\b(?:shift work|rotating shifts)"),
      p("\\bnachts(?![\\p{L}])|nachtarbeit|\\bnight (?:work|shifts?)"),
      p("\\bSonn- und Feiertag|\\ban Sonn|\\bon (?:weekends|Sundays|public holidays)"),
      p("jahresarbeitszeit|arbeitszeitkonto|\\bannuali[sz]ed hours"),
      p("rufbereitschaft|bereitschaftsdienst|\\bon[- ]call"),
      p("\\b(?:Mehrarbeit|Überstunden)~abgegolten|\\babgegolten~(?:Mehrarbeit|Überstunden)"),
      p("\\bandere[n]? (?:gleichwertige|zumutbare|angemessene)~(?:Tätigkeit|Arbeit|Aufgabe)|\\bandere[nr]? (?:Betriebsstätte|Filiale|Niederlassung|Standort)|\\bversetz"),
      p("\\b(?:additional|extra|further) hours|\\bwithout (?:additional|further|extra) (?:pay|remuneration|compensation)"),
      p("\\b(?:Arbeitszeit|Stunden)~(?:erhöht|verlängert|ausgeweitet)"),
      p("\\b(?:hours|shifts?) (?:will|may|can) vary|\\brota\\b|\\bat short notice|\\bbank holidays|\\bevenings"),
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
      p("\\b(?:secondary|outside|other|another|any other) (?:business|employment|occupation)"),
      p("\\bwork for a competitor|\\bnon-solicit|\\brestrictive covenant"),
      p("\\bweitere[nr]?~Beschäftigung"),
      p("konkurrenz|wettbewerber|mitbewerber|\\bcompeting (?:business|company)"),
      p("\\b(?:additional|second|another) job"),
    ],
  },
];

export const CATEGORY_BY_ID = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
