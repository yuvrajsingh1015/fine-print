import { useMemo, type CSSProperties } from "react";
import type { Finding } from "../analyze";
import { buildSegments } from "../highlight";
import { CATEGORY_BY_ID, type CategoryId, type Lang } from "../rules";

interface Props {
  text: string;
  findings: Finding[];
  filter: CategoryId | null;
  lang: Lang;
  onSelect: (finding: Finding) => void;
}

export default function HighlightedText({ text, findings, filter, lang, onSelect }: Props) {
  const segments = useMemo(() => buildSegments(text.length, findings), [text, findings]);

  return (
    <div className="max-h-[70vh] min-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-line bg-bg/40 p-4 text-[15px] leading-7">
      {segments.map((s) => {
        const piece = text.slice(s.start, s.end);
        if (s.findings.length === 0) return <span key={s.start}>{piece}</span>;
        const top = s.findings[0];
        const shown = filter ? s.findings.find((f) => f.categoryId === filter) : top;
        const color = CATEGORY_BY_ID[(shown ?? top).categoryId].color;
        return (
          <mark
            key={s.start}
            data-finding={s.findings.map((f) => f.id).join(" ")}
            className={`clause ${shown ? "" : "dim"}`}
            style={{ "--c": color } as CSSProperties}
            title={[...new Set(s.findings.map((f) => CATEGORY_BY_ID[f.categoryId].label[lang]))].join(", ")}
            onClick={() => onSelect(shown ?? top)}
          >
            {s.keyword ? <span className="kw">{piece}</span> : piece}
          </mark>
        );
      })}
    </div>
  );
}
