"use client";

// Right-hand drawer showing one note in full — structured header
// (type, badges, meta) + rendered markdown body + backlinks.

import { useEffect, useMemo } from "react";
import Markdown from "@/components/Markdown";
import { useLang } from "@/lib/i18n";
import { backlinks, positivePatternQuality, slugIndex } from "@/lib/analytics";
import {
  categoryOf,
  confidenceOf,
  priorityOf,
  severityOf,
  type Note,
  type Vault,
} from "@/lib/types";
import { ConfidenceBadge, LevelBadge } from "@/components/ui";

export const TYPE_LABEL: Record<string, string> = {
  interview: "Interview",
  theme: "Theme",
  "pain-point": "Pain Point",
  "positive-pattern": "Positive Pattern",
  need: "Need",
  insight: "Insight",
  recommendation: "Recommendation",
  requirement: "Requirement-Dokument",
  persona: "Persona",
  method: "Methodik",
  template: "Template",
  archive: "Rohtranskript",
  wiki: "Wiki",
  other: "Notiz",
};

export const TYPE_TONE: Record<string, string> = {
  interview: "bg-sky-100 text-sky-800",
  theme: "bg-indigo-100 text-indigo-800",
  "pain-point": "bg-rose-100 text-rose-800",
  "positive-pattern": "bg-lime-100 text-lime-800",
  need: "bg-amber-100 text-amber-800",
  insight: "bg-emerald-100 text-emerald-800",
  recommendation: "bg-teal-100 text-teal-800",
  requirement: "bg-cyan-100 text-cyan-800",
  persona: "bg-violet-100 text-violet-800",
  method: "bg-neutral-200 text-neutral-700",
  template: "bg-neutral-200 text-neutral-700",
  archive: "bg-neutral-200 text-neutral-700",
  wiki: "bg-neutral-200 text-neutral-700",
  other: "bg-neutral-200 text-neutral-700",
};

export function TypePill({ type }: { type: string }) {
  const { t } = useLang();
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${TYPE_TONE[type] ?? TYPE_TONE.other}`}
    >
      {t(TYPE_LABEL[type] ?? type)}
    </span>
  );
}

/** strip "## Referenz…"/"## Reference…" sections — methodology pointers, not results */
function stripReferenz(body: string): string {
  return body.replace(/^##\s+Referen(?:z|ce)[^\n]*\n[\s\S]*?(?=^##\s|(?![\s\S]))/gm, "");
}

export default function NoteDrawer({
  vault,
  note,
  onNavigate,
  onClose,
  quoteCuration,
  onEdit,
  onDelete,
}: {
  vault: Vault;
  note: Note;
  onNavigate: (slug: string) => void;
  onClose: () => void;
  quoteCuration?: {
    isStarred: (text: string) => boolean;
    onToggle: (text: string) => void;
  };
  onEdit?: (n: Note) => void;
  onDelete?: (n: Note) => void;
}) {
  const { t } = useLang();
  const idx = useMemo(() => slugIndex(vault), [vault]);
  const incoming = useMemo(() => backlinks(vault, note.slug), [vault, note.slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fm = note.frontmatter;
  const patternQuality =
    note.type === "positive-pattern" ? positivePatternQuality(note) : undefined;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="anim-fade absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-slide absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col rounded-l-3xl bg-white shadow-2xl">
        {/* header */}
        <div className="border-b border-neutral-200 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <TypePill type={note.type} />
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
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(note)}
                  title={t("Bearbeiten")}
                  className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-[#0057b8]"
                >
                  {t("Bearbeiten")}
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(note)}
                  title={note.manual ? t("Löschen") : t("Ausblenden")}
                  className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-500 hover:bg-red-50 hover:text-red-600"
                >
                  {note.manual ? t("Löschen") : t("Ausblenden")}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="cursor-pointer rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <h2 className="mt-2 text-lg font-extrabold leading-snug text-neutral-900">
            {note.title}
          </h2>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-neutral-500">
            {/* interview filenames contain participant names — folder only */}
            <span>{note.type === "interview" ? note.folder : note.path}</span>
            {fm["segment"] && <span>{t("Segment:")} {fm["segment"]}</span>}
            {categoryOf(note) && <span>{t("Kategorie:")} {categoryOf(note)}</span>}
            {fm["status"] && <span>{t("Status:")} {fm["status"]}</span>}
            {note.quotes.length > 0 && <span>{note.quotes.length} {t("Zitate")}</span>}
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {patternQuality && (
            <div
              className={`mb-4 rounded-xl border p-3 text-sm ${
                patternQuality.needsReview
                  ? "border-amber-200 bg-amber-50 text-amber-950"
                  : "border-blue-100 bg-blue-50/60 text-neutral-700"
              }`}
            >
              <div className="font-bold">
                {patternQuality.needsReview
                  ? t("Pattern-Evidenz prüfen")
                  : t("Pattern-Evidenz")}
              </div>
              <p className="mt-1 leading-relaxed">
                {patternQuality.distinctSources} {t("Interviewquellen")} ·{" "}
                {patternQuality.quoteCount} {t("Zitate")}.{" "}
                {t(
                  "Ein Positive Pattern braucht direkte Belege von mindestens zwei verschiedenen Interviewpersonen. Jedes Zitat muss dasselbe positive Muster stützen; problemorientierte Aussagen gehören zu einem Pain Point."
                )}
              </p>
              {patternQuality.unattributedQuotes > 0 && (
                <p className="mt-1 font-semibold">
                  {patternQuality.unattributedQuotes} {t("Zitate ohne Interviewquelle")}
                </p>
              )}
            </div>
          )}
          {note.type === "archive" ? (
            <pre className="whitespace-pre-wrap font-sans text-[0.85rem] leading-relaxed text-neutral-700">
              {note.body}
            </pre>
          ) : (
            <Markdown
              // drawer header already shows the title — drop the leading H1;
              // "Referenz" sections are methodology noise, hide them
              text={stripReferenz(note.body.replace(/^\s*#\s+[^\n]*\n/, ""))}
              resolve={(t) => idx.has(t.toLowerCase())}
              onNavigate={(t) => {
                const target = idx.get(t.toLowerCase());
                if (target) onNavigate(target.slug);
              }}
              // anonymized note titles as link labels (raw slugs contain names)
              labelFor={(t) => idx.get(t.toLowerCase())?.title}
              quoteCuration={quoteCuration}
            />
          )}

          {incoming.length > 0 && (
            <div className="mb-2 mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
                {t("Verlinkt von")} {incoming.length}{" "}
                {incoming.length === 1 ? t("Notiz") : t("Notizen")}
              </div>
              <div className="flex flex-wrap gap-2">
                {incoming.map((n) => (
                  <button
                    key={n.slug}
                    type="button"
                    onClick={() => onNavigate(n.slug)}
                    className="cursor-pointer rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#004a99] ring-1 ring-blue-200 hover:bg-blue-50"
                  >
                    {t(TYPE_LABEL[n.type] ?? n.type)}: {n.title.length > 48 ? n.title.slice(0, 48) + "…" : n.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
