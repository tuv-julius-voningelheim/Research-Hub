"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo } from "react";
import { byType, notesOf, slugIndex } from "@/lib/analytics";
import { divisionOf, programOf, useHub } from "@/lib/store";
import type { Note, NoteType, Vault } from "@/lib/types";
import NoteCard from "@/components/project/NoteCard";
import NoteDrawer from "@/components/project/NoteDrawer";
import Overview from "@/components/project/Overview";
import UploadZone from "@/components/project/UploadZone";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import { FileIcon, OrgIcon, ProgramIcon, UsersIcon } from "@/components/icons";
import { TypePill } from "@/components/project/NoteDrawer";

const TABS: { key: string; label: string; types: NoteType[] }[] = [
  { key: "overview", label: "Overview", types: [] },
  { key: "themes", label: "Themes", types: ["theme"] },
  { key: "pain-points", label: "Pain Points", types: ["pain-point"] },
  { key: "needs", label: "Needs", types: ["need"] },
  { key: "insights", label: "Insights", types: ["insight"] },
  { key: "recommendations", label: "Recommendations", types: ["recommendation"] },
  { key: "personas", label: "Personas", types: ["persona"] },
  { key: "interviews", label: "Interviews", types: ["interview", "archive"] },
  { key: "files", label: "Files", types: [] },
];

function MasterDataTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#004a99]">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-neutral-900">{value}</div>
        <div className="text-xs text-neutral-500">{label}</div>
      </div>
    </div>
  );
}

function FilesTab({ vault, onOpen }: { vault: Vault; onOpen: (n: Note) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, Note[]>();
    for (const n of vault.notes) {
      const folder = n.path.includes("/") ? n.path.split("/").slice(0, -1).join("/") : "/";
      if (!map.has(folder)) map.set(folder, []);
      map.get(folder)!.push(n);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [vault]);

  return (
    <div className="space-y-4">
      {groups.map(([folder, notes]) => (
        <Card key={folder}>
          <div className="border-b border-neutral-100 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-neutral-500">
            {folder === "/" ? "Vault-Root" : folder}
            <span className="ml-2 font-semibold normal-case text-neutral-400">
              {notes.length} {notes.length === 1 ? "Datei" : "Dateien"}
            </span>
          </div>
          <div className="divide-y divide-neutral-50">
            {notes.map((n) => (
              <button
                key={n.path}
                type="button"
                onClick={() => onOpen(n)}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50/40"
              >
                <span className="text-neutral-400">{FileIcon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-neutral-800">
                    {n.path.split("/").pop()}
                  </span>
                </span>
                <TypePill type={n.type} />
              </button>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, ready, attachVault, updateProject } = useHub();

  const project = state.projects.find((p) => p.id === params.id);
  const vault = project?.vault;
  const idx = useMemo(() => slugIndex(vault), [vault]);

  const tab = searchParams.get("tab") ?? "overview";
  const noteSlug = searchParams.get("note");
  const openNote = noteSlug ? idx.get(noteSlug.toLowerCase()) : undefined;

  const setQuery = useCallback(
    (next: { tab?: string; note?: string | null }) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (next.tab !== undefined) sp.set("tab", next.tab);
      if (next.note === null) sp.delete("note");
      else if (next.note !== undefined) sp.set("note", next.note);
      router.replace(`/projects/${params.id}?${sp.toString()}`, { scroll: false });
    },
    [params.id, router, searchParams]
  );

  const openNoteFn = useCallback(
    (n: Note) => setQuery({ note: n.slug }),
    [setQuery]
  );

  const types = useMemo(() => byType(vault), [vault]);

  if (!ready) return null;
  if (!project) {
    return (
      <EmptyState
        title="Projekt nicht gefunden"
        hint="Es wurde möglicherweise gelöscht."
        action={
          <Link href="/projects" className="text-sm font-bold text-[#004a99] hover:underline">
            ← Zurück zu Projects
          </Link>
        }
      />
    );
  }

  const program = programOf(state, project);
  const division = divisionOf(state, project);
  const interviews = notesOf(vault, "interview");

  return (
    <div className="space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Projects
      </Link>

      {/* header */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-neutral-900">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          {vault && (
            <div className="w-72">
              <UploadZone
                compact
                onParsed={(v) => attachVault(project.id, v)}
              />
            </div>
          )}
        </div>
        {project.description && (
          <p className="mt-1 text-sm text-neutral-500">{project.description}</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MasterDataTile icon={OrgIcon} value={division?.name ?? "—"} label="Division" />
          <MasterDataTile icon={ProgramIcon} value={program?.name ?? "—"} label="Program" />
          <MasterDataTile
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 2v8L4.5 20a1 1 0 0 0 .9 1.5h13.2a1 1 0 0 0 .9-1.5L14 10V2M8.5 2h7" />
              </svg>
            }
            value={project.method ?? "—"}
            label="Method"
          />
          <MasterDataTile icon={UsersIcon} value={interviews.length} label="Participants" />
          <MasterDataTile
            icon={FileIcon}
            value={vault?.notes.length ?? 0}
            label="Files"
          />
          <MasterDataTile
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            }
            value={
              vault
                ? new Date(vault.uploadedAt).toLocaleDateString("de-DE")
                : "—"
            }
            label="Last upload"
          />
        </div>
      </Card>

      {!vault ? (
        <UploadZone
          onParsed={(v) => {
            attachVault(project.id, v);
            if (project.status === "planned") {
              updateProject(project.id, { status: "in-analysis" });
            }
          }}
        />
      ) : (
        <>
          {/* tabs */}
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-1 border-b border-neutral-200">
              {TABS.map((t) => {
                const count =
                  t.types.length > 0
                    ? t.types.reduce((s, ty) => s + types[ty].length, 0)
                    : undefined;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setQuery({ tab: t.key, note: null })}
                    className={`cursor-pointer whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
                      active
                        ? "border-[#004a99] text-[#004a99]"
                        : "border-transparent text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    {t.label}
                    {count !== undefined && count > 0 && (
                      <span
                        className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${
                          active ? "bg-blue-50 text-[#004a99]" : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* tab content */}
          {tab === "overview" && <Overview vault={vault} onOpen={openNoteFn} />}
          {tab === "files" && <FilesTab vault={vault} onOpen={openNoteFn} />}
          {TABS.filter((t) => t.types.length > 0).map((t) => {
            if (tab !== t.key) return null;
            const notes = t.types.flatMap((ty) => types[ty]);
            return notes.length === 0 ? (
              <EmptyState
                key={t.key}
                title={`Keine ${t.label} im Export`}
                hint="Dieser Abschnitt war im hochgeladenen Second-Brain-Export leer."
              />
            ) : (
              <div key={t.key} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {notes.map((n) => (
                  <NoteCard
                    key={n.path}
                    note={n}
                    onOpen={openNoteFn}
                    showType={t.types.length > 1}
                  />
                ))}
              </div>
            );
          })}
        </>
      )}

      {vault && openNote && (
        <NoteDrawer
          vault={vault}
          note={openNote}
          onNavigate={(slug) => setQuery({ note: slug })}
          onClose={() => setQuery({ note: null })}
        />
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense>
      <ProjectDetail />
    </Suspense>
  );
}
