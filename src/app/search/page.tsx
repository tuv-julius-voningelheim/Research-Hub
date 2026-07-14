"use client";

// App-wide search across all uploaded vaults with occurrence statistics.

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useHub } from "@/lib/store";
import type { SearchSource } from "@/lib/search";
import SearchPanel from "@/components/SearchPanel";
import { EmptyState, PageHeader } from "@/components/ui";

export default function SearchPage() {
  const { state, ready } = useHub();
  const router = useRouter();

  const sources: SearchSource[] = useMemo(
    () =>
      state.projects
        .filter((p) => p.vault)
        .map((p) => ({ id: p.id, name: p.name, vault: p.vault })),
    [state.projects]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Search"
        sub="Volltextsuche über alle Projekte — mit Statistik: wie oft, in welchen Projekten und Notiz-Typen der Begriff vorkommt."
      />

      {ready && sources.length === 0 ? (
        <EmptyState
          title="Noch keine Inhalte"
          hint="Lade zuerst in einem Projekt einen Second-Brain-Export (ZIP) hoch."
        />
      ) : (
        <SearchPanel
          sources={sources}
          autoFocus
          onOpen={(sourceId, note) =>
            router.push(`/projects/${sourceId}?note=${encodeURIComponent(note.slug)}`)
          }
        />
      )}
    </div>
  );
}
