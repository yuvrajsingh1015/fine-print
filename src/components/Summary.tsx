import type { Finding } from "../analyze";
import type { Strings } from "../i18n";
import { CATEGORIES, type CategoryId, type Lang } from "../rules";

interface Props {
  findings: Finding[];
  lang: Lang;
  t: Strings;
  filter: CategoryId | null;
  onFilter: (id: CategoryId | null) => void;
}

export default function Summary({ findings, lang, t, filter, onFilter }: Props) {
  const rows = CATEGORIES.map((category) => {
    const own = findings.filter((f) => f.categoryId === category.id);
    const numbers = [...new Set(own.flatMap((f) => f.numbers))];
    return { category, count: own.length, numbers };
  });
  const found = rows.filter((r) => r.count > 0);
  const missing = rows.filter((r) => r.count === 0);

  return (
    <div>
      <p className="text-sm text-muted">{t.findingsCount(findings.length, found.length)}</p>
      {found.length > 0 && (
        <ul className="mt-3 space-y-1">
          {found.map(({ category, count, numbers }) => {
            const active = filter === category.id;
            return (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => onFilter(active ? null : category.id)}
                  aria-pressed={active}
                  className={`flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    active ? "border-accent/60 bg-card-hover" : "border-transparent hover:bg-card-hover"
                  }`}
                >
                  <span
                    className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-fg">{category.label[lang]}</span>
                    {numbers.length > 0 && (
                      <span className="block text-muted">
                        {numbers.map((n, i) => (
                          <span key={n}>
                            {i > 0 && ", "}
                            <strong className="font-semibold text-fg">{n}</strong>
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-xs text-subtle">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {filter && (
        <button type="button" onClick={() => onFilter(null)} className="mt-2 font-mono text-xs text-accent hover:underline">
          {t.showAll}
        </button>
      )}
      {found.length > 0 && missing.length > 0 && (
        <p className="mt-3 text-xs leading-relaxed text-subtle">
          {t.notFound}: {missing.map((r) => r.category.label[lang]).join(" · ")}
        </p>
      )}
    </div>
  );
}
