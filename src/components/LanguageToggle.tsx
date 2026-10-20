import type { Lang } from "../rules";

interface Props {
  lang: Lang;
  onChange: (lang: Lang) => void;
  label: string;
}

export default function LanguageToggle({ lang, onChange, label }: Props) {
  return (
    <div role="group" aria-label={label} className="flex rounded-md border border-line font-mono text-xs">
      {(["en", "de"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          aria-pressed={lang === code}
          className={`px-2.5 py-1.5 uppercase transition-colors ${
            lang === code ? "text-accent" : "text-subtle hover:text-fg"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
