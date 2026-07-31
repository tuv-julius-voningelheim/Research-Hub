"use client";

// Compact card for a note in a tab list — type-aware summary line,
// badges and the first representative quote.

import { interviewMeta, positivePatternQuality } from "@/lib/analytics";
import { useLang } from "@/lib/i18n";
import {
  categoryOf,
  confidenceOf,
  priorityOf,
  quoteKey,
  severityOf,
  type Note,
} from "@/lib/types";
import { Card, ConfidenceBadge, LevelBadge } from "@/components/ui";
import { TypePill } from "./NoteDrawer";

function summaryOf(n: Note): string | undefined {
  const f = n.fields;
  return (
    f["Beschreibung"] ||
    f["Description"] ||
    f["Insight"] ||
    f["Empfehlung"] ||
    f["Recommendation"] ||
    n.sections["Definition"] ||
    undefined
  );
}

export default function NoteCard({
  note,
  onOpen,
  showType,
  starred,
  onEdit,
  onDelete,
}: {
  note: Note;
  onOpen: (n: Note) => void;
  showType?: boolean;
  /** curated quote keys for this note — preferred for the preview */
  starred?: string[];
  /** edit affordance (app only, not in read-only share) */
  onEdit?: (n: Note) => void;
  onDelete?: (n: Note) => void;
}) {
  const { t } = useLang();
  const fm = note.frontmatter;
  const summary = summaryOf(note);
  // prefer a curated "killer quote" over the first one
  const quote =
    (starred?.length
      ? note.quotes.find((q) => starred.includes(quoteKey(q.text)))
      : undefined) ?? note.quotes[0];
  const isStarredQuote = !!(quote && starred?.includes(quoteKey(quote.text)));
  const kategorie = categoryOf(note);
  const meta = note.type === "interview" ? interviewMeta(note) : undefined;
  const patternQuality =
    note.type === "positive-pattern" ? positivePatternQuality(note) : undefined;

  return (
    <Card className="flex h-full flex-col p-4 transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => onOpen(note)}
        className="flex-1 cursor-pointer text-left"
      >
        <div className="flex flex-wrap items-center gap-2">
          {showType && <TypePill type={note.type} />}
          {note.manual && (
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">
              {t("Manuell")}
            </span>
          )}
          {note.edited && (
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-[#0057b8]">
              {t("Bearbeitet")}
            </span>
          )}
          <LevelBadge level={severityOf(note)} prefix="Severity" />
          <LevelBadge level={priorityOf(note)} prefix="Priority" />
          <ConfidenceBadge level={confidenceOf(note)} />
          {kategorie && (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
              {kategorie}
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
            <span>{meta.meaningUnits} Meaning Units</span>
          </div>
        ) : (
          summary && (
            <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-neutral-600">
              {summary.replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, "$1").replace(/\*\*/g, "")}
            </p>
          )
        )}

        {quote && note.type !== "interview" && (
          <blockquote
            className={`mt-3 border-l-2 pl-3 text-xs italic leading-relaxed ${
              isStarredQuote
                ? "border-amber-300 text-neutral-600"
                : "border-blue-200 text-neutral-500"
            }`}
          >
            {isStarredQuote && <span className="mr-1 not-italic text-amber-500">★</span>}
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
          {note.quotes.length > 0 && `${note.quotes.length} ${t("Zitate")}`}
          {patternQuality &&
            `${note.quotes.length > 0 ? " · " : ""}${patternQuality.distinctSources} ${t("Interviewquellen")}`}
          {note.quotes.length > 0 && note.links.length > 0 && " · "}
          {note.links.length > 0 && `${note.links.length} ${t("Verknüpfungen")}`}
        </span>
        <div className="flex items-center gap-2.5">
          {patternQuality?.needsReview && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800 ring-1 ring-amber-200">
              {t("Evidenz prüfen")}
            </span>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(note)}
              className="cursor-pointer font-semibold text-neutral-500 hover:text-[#0057b8]"
            >
              {t("Bearbeiten")}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(note)}
              className="cursor-pointer font-semibold text-neutral-400 hover:text-red-600"
              title={note.manual ? t("Löschen") : t("Ausblenden")}
            >
              {note.manual ? t("Löschen") : t("Ausblenden")}
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpen(note)}
            className="cursor-pointer font-bold text-[#004a99] hover:underline"
          >
            {t("Öffnen →")}
          </button>
        </div>
      </div>
    </Card>
  );
}
