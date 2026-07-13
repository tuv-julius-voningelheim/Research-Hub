"use client";

// Global full-text search across all uploaded vaults:
// titles, body text, quotes and #code tags — with type filter.

import Link from "next/link";
import { useMemo, useState } from "react";
import { useHub } from "@/lib/store";
import type { Note, NoteType, Project } from "@/lib/types";
import { Card, EmptyState, inputCls } from "@/components/ui";
import { TYPE_LABEL, TypePill } from "@/components/project/NoteDrawer";

const FILTERS: (NoteType | "all")[] = [
  "all",
  "theme",
  "pain-point",
  "need",
  "insight",
  "recommendation",
  "persona",
  "interview",
];

interface Hit {
  project: Project;
  note: Note;
  snippet?: string;
}

function makeSnippet(text: string, q: string): string | undefined {
  const i = text.toLowerCase().indexOf(q);
  if (i === -1) return undefined;
  const start = Math.max(0, i - 60);
  const end = Math.min(text.length, i + q.length + 90);
  return (
    (start > 0 ? "…" : "") +
    text.slice(start, end).replace(/\n+/g, " ") +
    (end < text.length ? "…" : "")
  );
}

export default function SearchPage() {
  const { state, ready } = useHub();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<NoteType | "all">("all");

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: Hit[] = [];
    for (const project of state.projects) {
      for (const note of project.vault?.notes ?? []) {
        if (typeFilter !== "all" && note.type !== typeFilter) continue;
        const inTitle = note.title.toLowerCase().includes(q);
        const inCodes = note.codes.some((c) => c.toLowerCase().includes(q));
        const inBody = note.body.toLowerCase().includes(q);
        if (!inTitle && !inCodes && !inBody) continue;
        out.push({
          project,
          note,
          snippet: inBody ? makeSnippet(note.body, q) : undefined,
        });
      }
    }
    // title hits first
    return out
      .sort((a, b) => {
        const at = a.note.title.toLowerCase().includes(q) ? 0 : 1;
        const bt = b.note.title.toLowerCase().includes(q) ? 0 : 1;
        return at - bt;
      })
      .slice(0, 100);
  }, [state.projects, query, typeFilter]);

  const hasVaults = state.projects.some((p) => p.vault);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-neutral-900">Search</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Volltextsuche über alle Projekte: Titel, Inhalte, Zitate und Codes.
        </p>
      </div>

      <input
        className={`${inputCls} max-w-xl`}
        placeholder="Suchen… (z. B. „Appendix ABC“, „Timeline“, #code/…)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setTypeFilter(f)}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition-colors ${
              typeFilter === f
                ? "bg-[#004a99] text-white"
                : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50"
            }`}
          >
            {f === "all" ? "Alle" : TYPE_LABEL[f]}
          </button>
        ))}
      </div>

      {!ready ? null : !hasVaults ? (
        <EmptyState
          title="Noch keine Inhalte"
          hint="Lade zuerst in einem Projekt einen Second-Brain-Export (ZIP) hoch."
        />
      ) : query.trim().length < 2 ? (
        <EmptyState title="Suchbegriff eingeben" hint="Mindestens 2 Zeichen." />
      ) : hits.length === 0 ? (
        <EmptyState title="Keine Treffer" hint="Anderen Suchbegriff oder Filter probieren." />
      ) : (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-neutral-500">
            {hits.length} {hits.length === 1 ? "Treffer" : "Treffer"}
          </div>
          {hits.map((h) => (
            <Link
              key={`${h.project.id}:${h.note.path}`}
              href={`/projects/${h.project.id}?note=${encodeURIComponent(h.note.slug)}`}
              className="block"
            >
              <Card className="p-4 transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-center gap-2">
                  <TypePill type={h.note.type} />
                  <span className="text-sm font-bold text-neutral-900">{h.note.title}</span>
                  <span className="text-xs text-neutral-400">· {h.project.name}</span>
                </div>
                {h.snippet && (
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
                    {h.snippet}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
