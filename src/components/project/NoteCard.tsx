"use client";

// Compact card for a note in a tab list — type-aware summary line,
// badges and the first representative quote.

import { interviewMeta } from "@/lib/analytics";
import type { Note } from "@/lib/types";
import { Card, ConfidenceBadge, LevelBadge } from "@/components/ui";
import { TypePill } from "./NoteDrawer";

function summaryOf(n: Note): string | undefined {
  const f = n.fields;
  return (
    f["Beschreibung"] ||
    f["Insight"] ||
    f["Empfehlung"] ||
    n.sections["Definition"] ||
    undefined
  );
}

export default function NoteCard({
  note,
  onOpen,
  showType,
}: {
  note: Note;
  onOpen: (n: Note) => void;
  showType?: boolean;
}) {
  const fm = note.frontmatter;
  const summary = summaryOf(note);
  const quote = note.quotes[0];
  const meta = note.type === "interview" ? interviewMeta(note) : undefined;

  return (
    <Card className="flex h-full flex-col p-4 transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => onOpen(note)}
        className="flex-1 cursor-pointer text-left"
      >
        <div className="flex flex-wrap items-center gap-2">
          {showType && <TypePill type={note.type} />}
          <LevelBadge level={fm["severity"]} prefix="Severity" />
          <LevelBadge level={fm["priority"]} prefix="Priority" />
          <ConfidenceBadge level={fm["confidence"]} />
          {fm["kategorie"] && (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
              {fm["kategorie"]}
            </span>
          )}
          {fm["status"] && (
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
              {fm["status"]}
            </span>
          )}
        </div>
        <h4 className="mt-2 text-[15px] font-bold leading-snug text-neutral-900">
          {note.title}
        </h4>

        {meta ? (
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-neutral-500">
            {meta.participantId && <span>{meta.participantId}</span>}
            {meta.segment && <span>{meta.segment}</span>}
            {meta.date && <span>{meta.date}</span>}
            <span>
              {meta.meaningUnits} Meaning Units · {meta.codes} Codes
            </span>
          </div>
        ) : (
          summary && (
            <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-neutral-600">
              {summary.replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, "$1").replace(/\*\*/g, "")}
            </p>
          )
        )}

        {quote && note.type !== "interview" && (
          <blockquote className="mt-3 border-l-2 border-blue-200 pl-3 text-xs italic leading-relaxed text-neutral-500">
            „{quote.text.length > 180 ? quote.text.slice(0, 180) + "…" : quote.text}“
            {quote.source && (
              <span className="ml-1 font-semibold not-italic text-neutral-400">
                — {quote.source}
              </span>
            )}
          </blockquote>
        )}
      </button>

      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2.5 text-xs text-neutral-400">
        <span>
          {note.quotes.length > 0 && `${note.quotes.length} Zitate`}
          {note.quotes.length > 0 && note.links.length > 0 && " · "}
          {note.links.length > 0 && `${note.links.length} Verknüpfungen`}
        </span>
        <button
          type="button"
          onClick={() => onOpen(note)}
          className="cursor-pointer font-bold text-[#004a99] hover:underline"
        >
          Öffnen →
        </button>
      </div>
    </Card>
  );
}
