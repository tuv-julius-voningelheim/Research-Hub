"use client";

// Public read-only view of one project's results (via share token).
// No sidebar, no editing — just the findings.

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { byType, slugIndex } from "@/lib/analytics";
import type { Note, NoteType, Vault } from "@/lib/types";
import NoteCard from "@/components/project/NoteCard";
import NoteDrawer from "@/components/project/NoteDrawer";
import Overview from "@/components/project/Overview";
import { EmptyState } from "@/components/ui";

interface ShareData {
  project: {
    name: string;
    description?: string;
    status: string;
    method?: string;
  };
  program?: string;
  division?: string;
  vault: Vault | null;
}

const TABS: { key: string; label: string; types: NoteType[] }[] = [
  { key: "overview", label: "Overview", types: [] },
  { key: "themes", label: "Themes", types: ["theme"] },
  { key: "pain-points", label: "Pain Points", types: ["pain-point"] },
  { key: "needs", label: "Needs", types: ["need"] },
  { key: "insights", label: "Insights", types: ["insight"] },
  { key: "recommendations", label: "Recommendations", types: ["recommendation"] },
  { key: "personas", label: "Personas", types: ["persona"] },
];

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound">("loading");
  const [tab, setTab] = useState("overview");
  const [noteSlug, setNoteSlug] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/share?token=${encodeURIComponent(params.token)}`)
      .then(async (res) => {
        if (!res.ok) {
          setStatus("notfound");
          return;
        }
        setData(await res.json());
        setStatus("ok");
      })
      .catch(() => setStatus("notfound"));
  }, [params.token]);

  const vault = data?.vault ?? undefined;
  const types = useMemo(() => byType(vault), [vault]);
  const idx = useMemo(() => slugIndex(vault), [vault]);
  const openNote = noteSlug ? idx.get(noteSlug.toLowerCase()) : undefined;
  const openFn = (n: Note) => setNoteSlug(n.slug);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
        Lade geteilte Ergebnisse…
      </div>
    );
  }

  if (status === "notfound" || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <EmptyState
          title="Link ungültig oder widerrufen"
          hint="Dieser Freigabe-Link existiert nicht mehr. Bitte eine neue Freigabe anfordern."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* public header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <Image src="/tuv-sud-logo.png" alt="TÜV SÜD" width={34} height={34} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold tracking-tight text-neutral-900">
              {data.project.name}
            </div>
            <div className="truncate text-xs text-neutral-500">
              {[data.division, data.program, data.project.method]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600 ring-1 ring-neutral-200">
            Read-only
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {!vault ? (
          <EmptyState
            title="Noch keine Auswertung"
            hint="Für dieses Projekt wurde noch kein Second-Brain-Export hochgeladen."
          />
        ) : (
          <div className="space-y-6">
            {/* tabs */}
            <div className="overflow-x-auto">
              <div className="flex min-w-max gap-0.5 border-b border-neutral-200">
                {TABS.map((t) => {
                  const count =
                    t.types.length > 0
                      ? t.types.reduce((s, ty) => s + types[ty].length, 0)
                      : undefined;
                  if (t.types.length > 0 && count === 0) return null;
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setTab(t.key);
                        setNoteSlug(null);
                      }}
                      className={`-mb-px cursor-pointer whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                        active
                          ? "border-[#0057b8] text-[#0057b8]"
                          : "border-transparent text-neutral-500 hover:text-neutral-800"
                      }`}
                    >
                      {t.label}
                      {count !== undefined && count > 0 && (
                        <span className="ml-1.5 text-xs font-medium text-neutral-400">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {tab === "overview" && <Overview vault={vault} onOpen={openFn} />}
            {TABS.filter((t) => t.types.length > 0).map((t) => {
              if (tab !== t.key) return null;
              const notes = t.types.flatMap((ty) => types[ty]);
              return (
                <div key={t.key} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {notes.map((n) => (
                    <NoteCard key={n.path} note={n} onOpen={openFn} />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        <footer className="mt-12 border-t border-neutral-200 pt-4 text-center text-xs text-neutral-400">
          TÜV SÜD · UX Research Insight Hub · geteilte, schreibgeschützte Ansicht
        </footer>
      </div>

      {vault && openNote && (
        <NoteDrawer
          vault={vault}
          note={openNote}
          onNavigate={(slug) => setNoteSlug(slug)}
          onClose={() => setNoteSlug(null)}
        />
      )}
    </div>
  );
}
