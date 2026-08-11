"use client";

// Combined "Insights & Recommendations" tab (colleague feedback):
// both belong together — insights explain the "why", each recommendation
// anchors to exactly one insight. Short descriptions explain the difference.

import { useMemo } from "react";
import { useLang } from "@/lib/i18n";
import { notesOf } from "@/lib/analytics";
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
  const { t } = useLang();
  const insights = useMemo(() => notesOf(vault, "insight"), [vault]);

  return (
    <div className="space-y-8">
      <section>
        <SectionIntro
          title="Insights"
          count={insights.length}
          desc={t("Synthese über mehrere Themes hinweg — das „Warum“ hinter den Mustern. Ein Insight fasst zusammen, was die Evidenz aus mehreren Interviews strukturell bedeutet.")}
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
    </div>
  );
}
