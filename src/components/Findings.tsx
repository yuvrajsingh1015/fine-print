import type { Finding } from "../analyze";
import type { Strings } from "../i18n";
import { CATEGORY_BY_ID, type Lang, type Severity } from "../rules";

interface Props {
  findings: Finding[];
  lang: Lang;
  t: Strings;
  activeId: string | null;
  onSelect: (finding: Finding) => void;
}

const SEVERITY_STYLE: Record<Severity, string> = {
  high: "border-red-400/50 text-red-400 light:text-red-600",
  medium: "border-amber-400/50 text-amber-400 light:text-amber-700",
  low: "border-line text-muted",
};

export default function Findings({ findings, lang, t, activeId, onSelect }: Props) {
  return (
    <ol className="space-y-3">
      {findings.map((f) => {
        const category = CATEGORY_BY_ID[f.categoryId];
        const explanation = f.explanation?.[lang] ?? category.explanation[lang];
        return (
          <li key={f.id}>
            <button
              type="button"
              id={`finding-${f.id}`}
              onClick={() => onSelect(f)}
              className={`finding group w-full rounded-lg border bg-card p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-card-hover ${
                activeId === f.id ? "border-accent/60" : "border-line"
              }`}
            >
              <span className="flex flex-wrap items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} aria-hidden="true" />
                <span className="font-medium text-fg">{category.label[lang]}</span>
                <span className={`rounded border px-1.5 py-0.5 font-mono text-[11px] uppercase ${SEVERITY_STYLE[f.severity]}`}>
                  {t.severity[f.severity]}
                </span>
                <span
                  className={`ml-auto font-mono text-[11px] ${f.source === "deep" ? "text-accent" : "text-subtle"}`}
                >
                  {t.source[f.source]}
                </span>
              </span>
              <span
                className="mt-2 block border-l-2 pl-3 text-sm leading-relaxed text-body line-clamp-4"
                style={{ borderColor: category.color }}
              >
                {f.quote}
              </span>
              <span className="mt-2 block text-sm text-muted">{explanation}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
