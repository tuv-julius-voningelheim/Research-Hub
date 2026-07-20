"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import { byType, notesOf, slugIndex } from "@/lib/analytics";
import { buildMarkdownReport, downloadTextFile } from "@/lib/export";
import {
  EDITABLE_TYPES,
  TYPE_TITLE,
  diffUpload,
  effectiveVault,
  extractEditable,
} from "@/lib/editable";
import { useLang } from "@/lib/i18n";
import { quoteKey, type EditableContent, type Note, type NoteType, type Vault } from "@/lib/types";
import ContextTab from "@/components/project/ContextTab";
import InsightsRecsTab from "@/components/project/InsightsRecsTab";
import NoteEditor from "@/components/project/NoteEditor";
import NotesTab from "@/components/project/NotesTab";
import RequirementsTab from "@/components/project/RequirementsTab";
import UploadDiffModal from "@/components/project/UploadDiffModal";
import ShareModal from "@/components/ShareModal";
import { btnPrimary, btnSecondary } from "@/components/ui";
import { divisionOf, programOf, useHub } from "@/lib/store";
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
  { key: "positives", label: "Positives", types: ["positive-pattern"] },
  { key: "needs", label: "Needs", types: ["need"] },
  { key: "insights-recs", label: "Insights & Recs", types: ["insight", "recommendation"] },
  { key: "personas", label: "Personas", types: ["persona"] },
  { key: "interviews", label: "Interviews", types: ["interview"] },
  { key: "context", label: "Kontext", types: [] },
  { key: "requirements", label: "Requirements", types: [] },
  { key: "notes", label: "Notizen", types: [] },
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
  const { t } = useLang();
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
            {folder === "/" ? t("Vault-Root") : folder}
            <span className="ml-2 font-semibold normal-case text-neutral-400">
              {notes.length} {notes.length === 1 ? t("Datei") : t("Dateien")}
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
                    {n.type === "interview" ? n.title : n.path.split("/").pop()}
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

type EditorState =
  | { mode: "new"; type: NoteType }
  | { mode: "edit"; type: NoteType; note: Note }
  | null;

function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    state,
    ready,
    mode,
    attachVault,
    updateProject,
    toggleQuoteStar,
    toggleQuestionHidden,
    upsertOverride,
    resetOverride,
    addManualNote,
    updateManualNote,
    removeManualNote,
    hideNote,
    restoreNote,
    applyUpload,
  } = useHub();
  const { t, dateLocale } = useLang();
  const [shareOpen, setShareOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(null);
  const [pendingUpload, setPendingUpload] = useState<Vault | null>(null);

  const project = state.projects.find((p) => p.id === params.id);
  const vault = useMemo(() => (project ? effectiveVault(project) : undefined), [project]);
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

  const openNoteFn = useCallback((n: Note) => setQuery({ note: n.slug }), [setQuery]);
  const types = useMemo(() => byType(vault), [vault]);

  const refOptions = useMemo(
    () => ({
      theme: (types.theme ?? []).map((n) => ({ slug: n.slug, title: n.title })),
      insight: (types.insight ?? []).map((n) => ({ slug: n.slug, title: n.title })),
    }),
    [types]
  );

  if (!ready) return null;
  if (!project) {
    return (
      <EmptyState
        title={t("Projekt nicht gefunden")}
        hint={t("Es wurde möglicherweise gelöscht.")}
        action={
          <Link href="/projects" className="text-sm font-bold text-[#004a99] hover:underline">
            {t("← Zurück zu Projects")}
          </Link>
        }
      />
    );
  }

  const program = programOf(state, project);
  const division = divisionOf(state, project);
  const interviews = notesOf(vault, "interview");
  const hasBase = !!project.vault;

  // ---- edit / delete handlers ----
  const editNote = (n: Note) => setEditor({ mode: "edit", type: n.type, note: n });
  const deleteNote = (n: Note) => {
    if (n.manual) {
      if (confirm(`„${n.title}" löschen?`)) removeManualNote(project.id, n.slug.replace(/^manual-/, ""));
    } else {
      hideNote(project.id, n.slug);
    }
    if (openNote?.slug === n.slug) setQuery({ note: null });
  };
  const saveEditor = (content: EditableContent) => {
    if (!editor) return;
    if (editor.mode === "new") {
      addManualNote(project.id, content);
    } else if (editor.note.manual) {
      updateManualNote(project.id, editor.note.slug.replace(/^manual-/, ""), content);
    } else {
      upsertOverride(project.id, editor.note.slug, content);
    }
    setEditor(null);
  };

  const handleUpload = (v: Vault) => {
    if (!hasBase) {
      attachVault(project.id, v);
      if (project.status === "planned") updateProject(project.id, { status: "in-analysis" });
    } else {
      setPendingUpload(v);
    }
  };

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
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mode === "shared" && (
              <button type="button" onClick={() => setShareOpen(true)} className={btnSecondary}>
                <span className="inline-flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
                  </svg>
                  {t("Teilen")}
                </span>
              </button>
            )}
            {vault && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    downloadTextFile(
                      `${project.name.replace(/[^\w-]+/g, "_")}_report.md`,
                      buildMarkdownReport({ ...project, vault }, {
                        program: program?.name,
                        division: division?.name,
                      })
                    )
                  }
                  className={btnSecondary}
                >
                  Markdown
                </button>
                <Link
                  href={`/projects/${project.id}/report`}
                  className="cursor-pointer rounded-lg bg-[#0057b8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#004a99]"
                >
                  PDF-Report
                </Link>
              </>
            )}
          </div>
        </div>
        {project.description && <p className="mt-1 text-sm text-neutral-500">{project.description}</p>}

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
          <MasterDataTile icon={FileIcon} value={vault?.notes.length ?? 0} label={t("Elemente")} />
          <MasterDataTile
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            }
            value={project.vault ? new Date(project.vault.uploadedAt).toLocaleDateString(dateLocale) : "—"}
            label="Last upload"
          />
        </div>
      </Card>

      {!vault ? (
        <>
          <UploadZone onParsed={handleUpload} />
          <div className="flex flex-wrap gap-2">
            {EDITABLE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={btnSecondary}
                onClick={() => setEditor({ mode: "new", type: t })}
              >
                + {TYPE_TITLE[t]}
              </button>
            ))}
          </div>
          <ContextTab project={project} />
        </>
      ) : (
        <>
          {/* tabs */}
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-0.5 border-b border-neutral-200">
              {TABS.map((tb) => {
                const count =
                  tb.key === "notes"
                    ? (project.nextSteps?.filter((s) => !s.done).length ?? 0)
                    : tb.key === "requirements"
                      ? (project.requirements?.filter((s) => !s.done).length ?? 0)
                      : tb.key === "context"
                        ? (project.goals?.length ?? 0) + (project.reportBlocks?.length ?? 0)
                        : tb.types.length > 0
                          ? tb.types.reduce((s, ty) => s + types[ty].length, 0)
                          : undefined;
                const active = tab === tb.key;
                return (
                  <button
                    key={tb.key}
                    type="button"
                    onClick={() => setQuery({ tab: tb.key, note: null })}
                    className={`-mb-px cursor-pointer whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                      active
                        ? "border-[#0057b8] text-[#0057b8]"
                        : "border-transparent text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    {t(tb.label)}
                    {count !== undefined && count > 0 && (
                      <span className="ml-1.5 text-xs font-medium text-neutral-400">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* tab content */}
          {tab === "overview" && (
            <Overview
              vault={vault}
              onOpen={openNoteFn}
              curation={{
                hiddenQuestions: project.hiddenQuestions,
                onToggleQuestion: (q) => toggleQuestionHidden(project.id, q),
              }}
              context={{ goals: project.goals, hypotheses: project.hypotheses, links: project.links }}
              reportBlocks={project.reportBlocks}
            />
          )}
          {tab === "insights-recs" && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => setEditor({ mode: "new", type: "insight" })}
                >
                  + Insight
                </button>
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => setEditor({ mode: "new", type: "recommendation" })}
                >
                  + Recommendation
                </button>
              </div>
              <InsightsRecsTab
                vault={vault}
                onOpen={openNoteFn}
                starredQuotes={project.starredQuotes}
                onEdit={editNote}
                onDelete={deleteNote}
              />
            </div>
          )}
          {tab === "context" && <ContextTab project={project} />}
          {tab === "requirements" && <RequirementsTab project={project} />}
          {tab === "notes" && <NotesTab project={project} />}
          {tab === "files" && (
            <div className="space-y-4">
              <UploadZone compact onParsed={handleUpload} />
              <FilesTab vault={vault} onOpen={openNoteFn} />
            </div>
          )}
          {TABS.filter(
            (tb) => tb.types.length > 0 && tb.key !== "insights-recs" && tb.key !== "interviews"
          ).map((tb) => {
            if (tab !== tb.key) return null;
            const notes = tb.types.flatMap((ty) => types[ty]);
            const editable = tb.types.every((ty) => EDITABLE_TYPES.includes(ty));
            const hidden = (project.hiddenNotes ?? [])
              .map((s) => project.vault?.notes.find((n) => n.slug === s))
              .filter((n): n is Note => !!n && tb.types.includes(n.type));
            return (
              <div key={tb.key} className="space-y-4">
                {editable && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className={btnPrimary}
                      onClick={() => setEditor({ mode: "new", type: tb.types[0] })}
                    >
                      + {TYPE_TITLE[tb.types[0]]}
                    </button>
                  </div>
                )}
                {notes.length === 0 ? (
                  <EmptyState
                    title={`${t("Keine")} ${tb.label}`}
                    hint={editable ? t("Lege manuell ein Element an oder lade einen Export hoch.") : ""}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {notes.map((n) => (
                      <NoteCard
                        key={n.path}
                        note={n}
                        onOpen={openNoteFn}
                        showType={tb.types.length > 1}
                        starred={project.starredQuotes?.[n.slug]}
                        onEdit={editable ? editNote : undefined}
                        onDelete={editable ? deleteNote : undefined}
                      />
                    ))}
                  </div>
                )}
                {hidden.length > 0 && (
                  <details className="rounded-xl bg-neutral-50 px-4 py-3 ring-1 ring-neutral-200">
                    <summary className="cursor-pointer text-xs font-semibold text-neutral-500">
                      {hidden.length} {t("ausgeblendet")}
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {hidden.map((n) => (
                        <li key={n.slug} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate text-neutral-500">{n.title}</span>
                          <button
                            type="button"
                            onClick={() => restoreNote(project.id, n.slug)}
                            className="shrink-0 cursor-pointer text-xs font-semibold text-[#0057b8] hover:underline"
                          >
                            {t("Einblenden")}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            );
          })}
          {tab === "interviews" && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {types.interview.length === 0 ? (
                <EmptyState title={`${t("Keine")} Interviews`} />
              ) : (
                types.interview.map((n) => (
                  <NoteCard key={n.path} note={n} onOpen={openNoteFn} />
                ))
              )}
            </div>
          )}
        </>
      )}

      {vault && openNote && (
        <NoteDrawer
          vault={vault}
          note={openNote}
          onNavigate={(slug) => setQuery({ note: slug })}
          onClose={() => setQuery({ note: null })}
          quoteCuration={{
            isStarred: (text) =>
              (project.starredQuotes?.[openNote.slug] ?? []).includes(quoteKey(text)),
            onToggle: (text) => toggleQuoteStar(project.id, openNote.slug, quoteKey(text)),
          }}
          onEdit={EDITABLE_TYPES.includes(openNote.type) ? editNote : undefined}
          onDelete={EDITABLE_TYPES.includes(openNote.type) ? deleteNote : undefined}
        />
      )}

      {editor && (
        <NoteEditor
          type={editor.type}
          initial={editor.mode === "edit" ? extractEditable(editor.note) : undefined}
          refOptions={refOptions}
          onSave={saveEditor}
          onClose={() => setEditor(null)}
          onDelete={
            editor.mode === "edit" && editor.note.manual
              ? () => {
                  removeManualNote(project.id, editor.note.slug.replace(/^manual-/, ""));
                  setEditor(null);
                }
              : editor.mode === "edit" && editor.note.edited
                ? () => {
                    resetOverride(project.id, editor.note.slug);
                    setEditor(null);
                  }
                : undefined
          }
          deleteLabel={
            editor.mode === "edit" && editor.note.edited && !editor.note.manual
              ? "Bearbeitung verwerfen"
              : undefined
          }
        />
      )}

      {pendingUpload && (
        <UploadDiffModal
          entries={diffUpload(project, pendingUpload)}
          vault={pendingUpload}
          onApply={(res) => {
            applyUpload(project.id, pendingUpload, res);
            setPendingUpload(null);
          }}
          onClose={() => setPendingUpload(null)}
        />
      )}

      {shareOpen && (
        <ShareModal kind="project" targetId={project.id} onClose={() => setShareOpen(false)} />
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
