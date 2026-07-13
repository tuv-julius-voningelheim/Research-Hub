"use client";

// Right-hand drawer showing one note in full — structured header
// (type, badges, meta) + rendered markdown body + backlinks.

import { useEffect, useMemo } from "react";
import Markdown from "@/components/Markdown";
import { backlinks, slugIndex } from "@/lib/analytics";
import type { Note, Vault } from "@/lib/types";
import { ConfidenceBadge, LevelBadge } from "@/components/ui";

export const TYPE_LABEL: Record<string, string> = {
  interview: "Interview",
  theme: "Theme",
  "pain-point": "Pain Point",
  need: "Need",
  insight: "Insight",
  recommendation: "Recommendation",
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
  need: "bg-amber-100 text-amber-800",
  insight: "bg-emerald-100 text-emerald-800",
  recommendation: "bg-teal-100 text-teal-800",
  persona: "bg-violet-100 text-violet-800",
  method: "bg-neutral-200 text-neutral-700",
  template: "bg-neutral-200 text-neutral-700",
  archive: "bg-neutral-200 text-neutral-700",
  wiki: "bg-neutral-200 text-neutral-700",
  other: "bg-neutral-200 text-neutral-700",
};

export function TypePill({ type }: { type: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${TYPE_TONE[type] ?? TYPE_TONE.other}`}
    >
      {TYPE_LABEL[type] ?? type}
    </span>
  );
}

export default function NoteDrawer({
  vault,
  note,
  onNavigate,
  onClose,
}: {
  vault: Vault;
  note: Note;
  onNavigate: (slug: string) => void;
  onClose: () => void;
}) {
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

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-white shadow-2xl">
        {/* header */}
        <div className="border-b border-neutral-200 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <TypePill type={note.type} />
              <LevelBadge level={fm["severity"]} prefix="Severity" />
              <LevelBadge level={fm["priority"]} prefix="Priority" />
              <ConfidenceBadge level={fm["confidence"]} />
            </div>
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
          <h2 className="mt-2 text-lg font-extrabold leading-snug text-neutral-900">
            {note.title}
          </h2>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-neutral-500">
            <span>{note.path}</span>
            {fm["datum"] && <span>Datum: {fm["datum"]}</span>}
            {fm["segment"] && <span>Segment: {fm["segment"]}</span>}
            {fm["kategorie"] && <span>Kategorie: {fm["kategorie"]}</span>}
            {fm["status"] && <span>Status: {fm["status"]}</span>}
            {note.quotes.length > 0 && <span>{note.quotes.length} Zitate</span>}
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {note.type === "archive" ? (
            <pre className="whitespace-pre-wrap font-sans text-[0.85rem] leading-relaxed text-neutral-700">
              {note.body}
            </pre>
          ) : (
            <Markdown
              text={note.body}
              resolve={(t) => idx.has(t.toLowerCase())}
              onNavigate={(t) => {
                const target = idx.get(t.toLowerCase());
                if (target) onNavigate(target.slug);
              }}
            />
          )}

          {incoming.length > 0 && (
            <div className="mb-2 mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
                Verlinkt von {incoming.length} {incoming.length === 1 ? "Notiz" : "Notizen"}
              </div>
              <div className="flex flex-wrap gap-2">
                {incoming.map((n) => (
                  <button
                    key={n.slug}
                    type="button"
                    onClick={() => onNavigate(n.slug)}
                    className="cursor-pointer rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#004a99] ring-1 ring-blue-200 hover:bg-blue-50"
                  >
                    {TYPE_LABEL[n.type] ?? n.type}: {n.title.length > 48 ? n.title.slice(0, 48) + "…" : n.title}
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
