"use client";

// Smart search UI shared by the app-wide search page and read-only share
// views: live stats (occurrences, notes, per project / per type), filters
// and highlighted snippets.

import { useMemo, useState, type ReactNode } from "react";
import { queryRegex, searchVaults, type SearchSource } from "@/lib/search";
import type { Note, NoteType } from "@/lib/types";
import { Card, EmptyState, inputCls } from "@/components/ui";
import { TYPE_LABEL, TypePill } from "@/components/project/NoteDrawer";

const TYPE_FILTERS: (NoteType | "all")[] = [
  "all",
  "theme",
  "pain-point",
  "positive-pattern",
  "need",
  "insight",
  "recommendation",
  "persona",
  "interview",
];

function Highlight({ text, query }: { text: string; query: string }) {
  if (query.trim().length < 2) return <>{text}</>;
  const re = queryRegex(query);
  const parts = text.split(re);
  const matches = text.match(re) ?? [];
  const out: ReactNode[] = [];
  parts.forEach((p, i) => {
    out.push(p);
    if (i < matches.length) {
      out.push(
        <mark key={i} className="rounded-sm bg-amber-100 px-0.5 font-semibold text-amber-900">
          {matches[i]}
        </mark>
      );
    }
  });
  return <>{out}</>;
}

export default function SearchPanel({
  sources,
  onOpen,
  autoFocus,
}: {
  sources: SearchSource[];
  onOpen: (sourceId: string, note: Note) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<NoteType | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const result = useMemo(
    () => searchVaults(sources, query, typeFilter, sourceFilter),
    [sources, query, typeFilter, sourceFilter]
  );
  const { hits, stats } = result;
  const active = query.trim().length >= 2;
  const maxSource = Math.max(1, ...stats.perSource.map((s) => s.occurrences));

  return (
    <div className="space-y-5">
      <input
        className={`${inputCls} max-w-xl text-[15px]`}
        placeholder="Suchen… (z. B. „Appendix ABC“, „Timeline“, „EUDAMED“)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus={autoFocus}
      />

      {/* filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setTypeFilter(f)}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-colors ${
              typeFilter === f
                ? "bg-[#0057b8] text-white ring-[#0057b8]"
                : "bg-white text-neutral-600 ring-neutral-200 hover:bg-neutral-50"
            }`}
          >
            {f === "all" ? "Alle Typen" : TYPE_LABEL[f]}
          </button>
        ))}
        {sources.length > 1 && (
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="ml-auto cursor-pointer rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-600 outline-none"
          >
            <option value="all">Alle Projekte</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* stats */}
      {active && stats.noteCount > 0 && (
        <Card className="anim-rise p-4">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <span className="text-xl font-bold text-neutral-900">
                {stats.totalOccurrences}
              </span>
              <span className="ml-1.5 text-xs text-neutral-500">Vorkommen</span>
            </div>
            <div>
              <span className="text-xl font-bold text-neutral-900">{stats.noteCount}</span>
              <span className="ml-1.5 text-xs text-neutral-500">Notizen</span>
            </div>
            <div>
              <span className="text-xl font-bold text-neutral-900">
                {stats.perSource.length}
              </span>
              <span className="ml-1.5 text-xs text-neutral-500">
                {stats.perSource.length === 1 ? "Projekt" : "Projekte"}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {stats.perType.map((t) => (
                <span
                  key={t.type}
                  className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600"
                >
                  {TYPE_LABEL[t.type]} {t.occurrences}×
                </span>
              ))}
            </div>
          </div>
          {stats.perSource.length > 1 && (
            <div className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3">
              {stats.perSource.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-xs font-semibold text-neutral-700">
                    {s.name}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-[#2a78d6]"
                      style={{ width: `${(s.occurrences / maxSource) * 100}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right text-xs text-neutral-500">
                    {s.occurrences}× · {s.notes}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* results */}
      {!active ? (
        <EmptyState
          title="Suchbegriff eingeben"
          hint="Mindestens 2 Zeichen. Durchsucht Titel, Inhalte und Zitate — mit Statistik, wie oft und wo der Begriff vorkommt."
        />
      ) : hits.length === 0 ? (
        <EmptyState title="Keine Treffer" hint="Anderen Suchbegriff oder Filter probieren." />
      ) : (
        <div className="space-y-2">
          {hits.map((h) => (
            <button
              key={`${h.sourceId}:${h.note.path}`}
              type="button"
              onClick={() => onOpen(h.sourceId, h.note)}
              className="elev elev-hover block w-full cursor-pointer rounded-xl border border-neutral-200 bg-white p-4 text-left"
            >
              <div className="flex flex-wrap items-center gap-2">
                <TypePill type={h.note.type} />
                <span className="text-sm font-bold text-neutral-900">
                  <Highlight text={h.note.title} query={query} />
                </span>
                <span className="ml-auto flex items-center gap-2 text-xs text-neutral-400">
                  {sources.length > 1 && <span>{h.sourceName}</span>}
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 font-bold text-[#0057b8]">
                    {h.occurrences}×
                  </span>
                </span>
              </div>
              {h.snippets.map((sn, i) => (
                <p key={i} className="mt-1.5 text-sm leading-relaxed text-neutral-500">
                  <Highlight text={sn} query={query} />
                </p>
              ))}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
