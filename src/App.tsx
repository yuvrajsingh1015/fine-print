import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { analyze, type Finding } from "./analyze";
import { DeepCheckError, mergeFindings, requestDeepCheck, type DeepErrorCode, type DeepResult } from "./deepcheck";
import { STRINGS } from "./i18n";
import type { OcrProgress, PdfErrorCode } from "./pdf";
import type { CategoryId, Lang } from "./rules";
import { SAMPLES, type Sample } from "./samples";
import Button from "./components/Button";
import Dialog from "./components/Dialog";
import Findings from "./components/Findings";
import HighlightedText from "./components/HighlightedText";
import LanguageToggle from "./components/LanguageToggle";
import Summary from "./components/Summary";
import ThemeToggle from "./components/ThemeToggle";

const DEEP_CHECK_URL = import.meta.env.VITE_DEEP_CHECK_URL;
const YEAR = new Date().getFullYear();

type DeepState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; result: DeepResult }
  | { status: "error"; code: DeepErrorCode };

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem("fp-lang");
    if (saved === "en" || saved === "de") return saved;
  } catch {
    // storage blocked: fall back to the browser language
  }
  return navigator.language?.toLowerCase().startsWith("de") ? "de" : "en";
}

function flash(el: Element) {
  el.classList.remove("flash");
  void (el as HTMLElement).offsetWidth; // restart the animation
  el.classList.add("flash");
  window.setTimeout(() => el.classList.remove("flash"), 1500);
}

export default function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const t = STRINGS[lang];

  const [text, setText] = useState("");
  const [scanned, setScanned] = useState<string | null>(null);
  const [filter, setFilter] = useState<CategoryId | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pdfState, setPdfState] = useState<"idle" | "loading" | PdfErrorCode>("idle");
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [ocrInfo, setOcrInfo] = useState<{ skippedPages: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [deep, setDeep] = useState<DeepState>({ status: "idle" });
  const [consented, setConsented] = useState(false);
  const [dialog, setDialog] = useState<"consent" | "privacy" | null>(null);
  const deepAbort = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `Fine Print · ${lang === "de" ? "Vertragsklauseln verstehen" : "Understand contract terms"}`;
    try {
      localStorage.setItem("fp-lang", lang);
    } catch {
      // not remembered, that's fine
    }
  }, [lang]);

  const ruleFindings = useMemo(() => (scanned ? analyze(scanned) : []), [scanned]);
  const findings = useMemo(
    () => (deep.status === "done" ? mergeFindings(ruleFindings, deep.result.findings) : ruleFindings),
    [ruleFindings, deep],
  );
  const visible = filter ? findings.filter((f) => f.categoryId === filter) : findings;

  function scan(value: string) {
    deepAbort.current?.abort();
    deepAbort.current = null;
    setScanned(value.trim() ? value : null);
    setDeep({ status: "idle" });
    setFilter(null);
    setActiveId(null);
  }

  function loadSample(sample: Sample) {
    setText(sample.text);
    setPdfState("idle");
    setOcrInfo(null);
    scan(sample.text);
  }

  function clear() {
    setText("");
    setPdfState("idle");
    setOcrInfo(null);
    scan("");
  }

  async function readPdf(file: File) {
    setPdfState("loading");
    setOcrInfo(null);
    try {
      const { extractPdfText } = await import("./pdf");
      const result = await extractPdfText(file, setOcrProgress);
      setText(result.text);
      setPdfState("idle");
      setOcrInfo(result.ocr ? { skippedPages: result.skippedPages } : null);
      scan(result.text);
    } catch (error) {
      const code = (error as { code?: PdfErrorCode }).code;
      setPdfState(code ?? "failed");
    } finally {
      setOcrProgress(null);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void readPdf(file);
  }

  async function runDeepCheck() {
    if (!scanned) return;
    deepAbort.current?.abort();
    const controller = new AbortController();
    deepAbort.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 45_000);
    setDeep({ status: "running" });
    try {
      const result = await requestDeepCheck(DEEP_CHECK_URL, scanned, controller.signal);
      if (!controller.signal.aborted) setDeep({ status: "done", result });
    } catch (error) {
      if (deepAbort.current !== controller) return; // a newer scan replaced this one
      setDeep({ status: "error", code: error instanceof DeepCheckError ? error.code : "unavailable" });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function onDeepClick() {
    if (consented) void runDeepCheck();
    else setDialog("consent");
  }

  // finding card clicked: jump to the clause in the text
  function showInText(finding: Finding) {
    setActiveId(finding.id);
    const marks = document.querySelectorAll(`mark[data-finding~="${finding.id}"]`);
    marks[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
    marks.forEach(flash);
  }

  // clause clicked in the text: jump to its card
  function showInList(finding: Finding) {
    if (filter && filter !== finding.categoryId) setFilter(null);
    setActiveId(finding.id);
    window.requestAnimationFrame(() => {
      const card = document.getElementById(`finding-${finding.id}`);
      if (!card) return;
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      flash(card);
    });
  }

  const ruleCount = ruleFindings.length;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-bg/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="./" className="font-mono text-sm text-fg">
            <span className="text-accent">~/</span>fine-print
          </a>
          <div className="flex items-center gap-2">
            <LanguageToggle lang={lang} onChange={setLang} label={t.langSwitch} />
            <ThemeToggle t={t} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <section className="max-w-3xl animate-fade">
          <h1 className="text-4xl font-bold tracking-tight text-fg sm:text-5xl">{t.title}</h1>
          <p className="mt-4 text-lg text-body sm:text-xl">{t.tagline}</p>
          <p className="mt-5 flex gap-3 rounded-lg border border-line bg-card p-4 text-sm leading-relaxed text-muted">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <span>{t.privacy}</span>
          </p>
          <p className="mt-3 font-mono text-xs text-subtle">{t.disclaimer}</p>
        </section>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          <section
            aria-labelledby="scan-heading"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`rounded-lg border bg-card p-4 transition-colors sm:p-6 ${
              dragging ? "border-accent" : "border-line"
            }`}
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="scan-heading" className="font-mono text-sm text-fg">
                {t.scanHeading}
                <span className="ml-1 animate-blink text-accent">▍</span>
              </h2>
              {text && <span className="font-mono text-xs text-subtle">{t.characters(text.length)}</span>}
            </div>

            <div className="mt-4">
              {scanned ? (
                <HighlightedText
                  text={scanned}
                  findings={findings}
                  filter={filter}
                  lang={lang}
                  onSelect={showInList}
                />
              ) : (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t.placeholder}
                  aria-label={t.placeholder}
                  spellCheck={false}
                  className="block min-h-72 w-full resize-y rounded-md border border-line bg-bg/40 p-4 text-[15px] leading-7 text-body placeholder:text-subtle focus:border-accent/60 focus:outline-none sm:min-h-96"
                />
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {scanned ? (
                <Button onClick={() => setScanned(null)}>{t.edit}</Button>
              ) : (
                <Button variant="primary" onClick={() => scan(text)} disabled={!text.trim()}>
                  {t.scan}
                </Button>
              )}
              <Button onClick={() => fileInput.current?.click()} disabled={pdfState === "loading"}>
                {pdfState !== "loading" ? t.uploadPdf : ocrProgress ? t.ocrRunning(ocrProgress.page, ocrProgress.pages) : t.readingPdf}
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void readPdf(file);
                }}
              />
              {text && (
                <button type="button" onClick={clear} className="font-mono text-sm text-subtle hover:text-accent">
                  {t.clear}
                </button>
              )}
              <span className="hidden font-mono text-xs text-subtle sm:inline">{t.dropHint}</span>
            </div>

            {ocrInfo && scanned && (
              <p className="mt-3 text-sm text-muted">
                {t.ocrNote}
                {ocrInfo.skippedPages > 0 && ` ${t.ocrSkipped(ocrInfo.skippedPages)}`}
              </p>
            )}

            {pdfState !== "idle" && pdfState !== "loading" && (
              <p role="alert" className="mt-3 text-sm text-red-400 light:text-red-600">
                {t.pdfErrors[pdfState]}
              </p>
            )}

            <div className="mt-6 border-t border-line pt-4">
              <p className="font-mono text-xs text-subtle">{t.tryExample}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SAMPLES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => loadSample(sample)}
                    className="rounded-full border border-line px-3 py-1 text-sm text-muted transition-colors hover:border-accent/60 hover:text-accent"
                  >
                    {sample.label[lang]}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
            <section aria-labelledby="summary-heading" className="rounded-lg border border-line bg-card p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 id="summary-heading" className="font-mono text-sm text-fg">
                  {t.summaryHeading}
                </h2>
                {scanned && (
                  <Button
                    onClick={onDeepClick}
                    disabled={deep.status === "running"}
                    className="px-3 py-1.5 text-xs"
                  >
                    {deep.status === "running" ? t.deepRunning : t.deepCheck}
                  </Button>
                )}
              </div>
              <div className="mt-3">
                {scanned ? (
                  <Summary findings={findings} lang={lang} t={t} filter={filter} onFilter={setFilter} />
                ) : (
                  <p className="text-sm text-muted">{t.emptyState}</p>
                )}
              </div>
              {deep.status === "error" && (
                <p role="alert" className="mt-4 rounded-md border border-red-400/40 p-3 text-sm text-red-400 light:text-red-600">
                  {t.deepErrors[deep.code]}
                </p>
              )}
              {deep.status === "done" && (
                <div className="mt-4 rounded-md border border-accent/40 p-3 text-sm">
                  <p className="font-mono text-xs text-accent">{t.deepSummary}</p>
                  {deep.result.summary[lang] && <p className="mt-2 text-body">{deep.result.summary[lang]}</p>}
                  <p className="mt-2 text-muted">{t.deepAdded(findings.length - ruleCount)}</p>
                </div>
              )}
            </section>

            {scanned && (
              <section aria-labelledby="findings-heading">
                <h2 id="findings-heading" className="mb-3 font-mono text-sm text-fg">
                  {t.findingsHeading}
                </h2>
                {findings.length === 0 ? (
                  <p className="rounded-lg border border-line bg-card p-4 text-sm text-muted">{t.nothingFound}</p>
                ) : (
                  <Findings findings={visible} lang={lang} t={t} activeId={activeId} onSelect={showInText} />
                )}
              </section>
            )}
          </aside>
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-8 font-mono text-xs text-subtle sm:px-6">
          <span>© {YEAR} Yuvraj Singh</span>
          <button type="button" onClick={() => setDialog("privacy")} className="hover:text-accent">
            {t.privacyLink}
          </button>
          <a href="https://github.com/yuvrajsingh1015/fine-print" className="hover:text-accent">
            GitHub
          </a>
          <a href="https://yuvrajsingh.de" className="ml-auto hover:text-accent">
            ← {t.footerBack}
          </a>
        </div>
      </footer>

      <Dialog
        open={dialog === "consent"}
        title={t.consentTitle}
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button onClick={() => setDialog(null)}>{t.cancel}</Button>
            <Button
              variant="primary"
              onClick={() => {
                setConsented(true);
                setDialog(null);
                void runDeepCheck();
              }}
            >
              {t.consentAccept}
            </Button>
          </>
        }
      >
        {t.consentBody.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </Dialog>

      <Dialog
        open={dialog === "privacy"}
        title={t.privacyTitle}
        onClose={() => setDialog(null)}
        actions={<Button onClick={() => setDialog(null)}>{t.close}</Button>}
      >
        {t.privacyBody.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </Dialog>
    </div>
  );
}
