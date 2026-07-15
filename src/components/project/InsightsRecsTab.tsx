"use client";

// Combined "Insights & Recommendations" tab (colleague feedback):
// both belong together — insights explain the "why", each recommendation
// anchors to exactly one insight. Short descriptions explain the difference.

import { useMemo } from "react";
import { notesOf, recTraces } from "@/lib/analytics";
import type { Note, Vault } from "@/lib/types";
import NoteCard from "./NoteCard";

function SectionIntro({
  title,
  desc,
  count,
}: {
  title: string;
  desc: string;
  count: number;
}) {
  return (
    <div className="mb-3">
      <h3 className="text-[15px] font-bold tracking-tight text-neutral-900">
        {title}
        <span className="ml-2 align-middle text-xs font-semibold text-neutral-400">
          {count}
        </span>
      </h3>
      <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-neutral-500">{desc}</p>
    </div>
  );
}

export default function InsightsRecsTab({
  vault,
  onOpen,
  starredQuotes,
  onEdit,
  onDelete,
}: {
  vault: Vault;
  onOpen: (n: Note) => void;
  starredQuotes?: Record<string, string[]>;
  onEdit?: (n: Note) => void;
  onDelete?: (n: Note) => void;
}) {
  const insights = useMemo(() => notesOf(vault, "insight"), [vault]);
  const recs = useMemo(() => recTraces(vault), [vault]);

  return (
    <div className="space-y-8">
      <section>
        <SectionIntro
          title="Insights"
          count={insights.length}
          desc="Synthese über mehrere Themes hinweg — das „Warum“ hinter den Mustern. Ein Insight fasst zusammen, was die Evidenz aus mehreren Interviews strukturell bedeutet."
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {insights.map((n) => (
            <NoteCard
              key={n.path}
              note={n}
              onOpen={onOpen}
              starred={starredQuotes?.[n.slug]}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionIntro
          title="Recommendations"
          count={recs.length}
          desc="Konkrete Handlungsempfehlungen — jede ist an genau ein Anker-Insight verankert, damit die Begründung bis zum Originalzitat nachvollziehbar bleibt."
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {recs.map((r) => (
            <div key={r.note.path} className="flex flex-col">
              <NoteCard
                note={r.note}
                onOpen={onOpen}
                starred={starredQuotes?.[r.note.slug]}
                onEdit={onEdit}
                onDelete={onDelete}
              />
              {r.anchorInsight && (
                <button
                  type="button"
                  onClick={() => onOpen(r.anchorInsight!)}
                  className="-mt-1 flex cursor-pointer items-center gap-2 rounded-b-xl border border-t-0 border-emerald-100 bg-emerald-50/60 px-4 py-2 text-left text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100/60"
                >
                  <span className="shrink-0 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                    Anker
                  </span>
                  <span className="truncate">{r.anchorInsight.title}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
