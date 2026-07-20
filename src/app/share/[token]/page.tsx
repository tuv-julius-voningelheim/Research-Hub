"use client";

// Public read-only view for share links. Depending on the link scope this
// shows one project, a whole program or a whole division — with drill-down
// into every child project and a smart search across the shared scope.

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  aggregateThemes,
  byType,
  mergeVaults,
  notesOf,
  rankPainPoints,
  severityDistribution,
  slugIndex,
  totalQuotes,
} from "@/lib/analytics";
import { LangToggle, useLang } from "@/lib/i18n";
import type { SearchSource } from "@/lib/search";
import type { Note, NoteType, ProjectLink, ReportBlock, Vault } from "@/lib/types";
import { BarRow, SEVERITY_COLOR } from "@/components/Bars";
import InsightsRecsTab from "@/components/project/InsightsRecsTab";
import NoteCard from "@/components/project/NoteCard";
import NoteDrawer from "@/components/project/NoteDrawer";
import Overview from "@/components/project/Overview";
import SearchPanel from "@/components/SearchPanel";
import {
  Card,
  ConfidenceBadge,
  EmptyState,
  LevelBadge,
  SectionTitle,
  StatTile,
} from "@/components/ui";

interface SharedProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  method?: string;
  programId: string;
  programName?: string;
  createdAt: number;
  starredQuotes?: Record<string, string[]>;
  hiddenQuestions?: string[];
  goals?: string[];
  hypotheses?: string[];
  links?: ProjectLink[];
  reportBlocks?: ReportBlock[];
  vault: Vault | null;
}

interface ShareData {
  kind: "project" | "program" | "division";
  title: string;
  subtitle: string;
  programs: { id: string; name: string }[];
  projects: SharedProject[];
}

const PROJECT_TABS: { key: string; label: string; types: NoteType[] }[] = [
  { key: "overview", label: "Overview", types: [] },
  { key: "themes", label: "Themes", types: ["theme"] },
  { key: "pain-points", label: "Pain Points", types: ["pain-point"] },
  { key: "positives", label: "Positives", types: ["positive-pattern"] },
  { key: "needs", label: "Needs", types: ["need"] },
  { key: "insights-recs", label: "Insights & Recs", types: ["insight", "recommendation"] },
  { key: "personas", label: "Personas", types: ["persona"] },
];

function TabBar({
  tabs,
  active,
  onSelect,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onSelect: (k: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-0.5 border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onSelect(t.key)}
            className={`-mb-px cursor-pointer whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${
              active === t.key
                ? "border-[#0057b8] text-[#0057b8]"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 text-xs font-medium text-neutral-400">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/** read-only view of one shared project (tabs + drawer) */
function ProjectView({
  project,
  onBack,
  initialNote,
}: {
  project: SharedProject;
  onBack?: () => void;
  initialNote?: string | null;
}) {
  const vault = project.vault ?? undefined;
  const { t } = useLang();
  const [tab, setTab] = useState("overview");
  const [noteSlug, setNoteSlug] = useState<string | null>(initialNote ?? null);
  const types = useMemo(() => byType(vault), [vault]);
  const idx = useMemo(() => slugIndex(vault), [vault]);
  const openNote = noteSlug ? idx.get(noteSlug.toLowerCase()) : undefined;
  const openFn = (n: Note) => setNoteSlug(n.slug);

  useEffect(() => {
    setNoteSlug(initialNote ?? null);
  }, [initialNote, project.id]);

  return (
    <div className="space-y-6">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m15 18-6-6 6-6" />
          </svg>
          {t("Übersicht")}
        </button>
      )}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-neutral-900">
          {project.name}
        </h2>
        <p className="text-sm text-neutral-500">
          {[project.programName, project.method].filter(Boolean).join(" · ")}
        </p>
      </div>

      {!vault ? (
        <EmptyState
          title={t("Noch keine Auswertung")}
          hint={t("Für dieses Projekt wurde noch kein Export hochgeladen.")}
        />
      ) : (
        <>
          <TabBar
            tabs={PROJECT_TABS.map((t) => ({
              key: t.key,
              label: t.label,
              count:
                t.types.length > 0
                  ? t.types.reduce((s, ty) => s + types[ty].length, 0)
                  : undefined,
            })).filter((t) => t.count === undefined || t.count > 0)}
            active={tab}
            onSelect={(k) => {
              setTab(k);
              setNoteSlug(null);
            }}
          />

          {tab === "overview" && (
            <Overview
              vault={vault}
              onOpen={openFn}
              curation={{ hiddenQuestions: project.hiddenQuestions }}
              context={{
                goals: project.goals,
                hypotheses: project.hypotheses,
                links: project.links,
              }}
              reportBlocks={project.reportBlocks}
            />
          )}
          {tab === "insights-recs" && (
            <InsightsRecsTab
              vault={vault}
              onOpen={openFn}
              starredQuotes={project.starredQuotes}
            />
          )}
          {PROJECT_TABS.filter((t) => t.types.length > 0 && t.key !== "insights-recs").map(
            (t) => {
              if (tab !== t.key) return null;
              const notes = t.types.flatMap((ty) => types[ty]);
              return (
                <div key={t.key} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {notes.map((n) => (
                    <NoteCard
                      key={n.path}
                      note={n}
                      onOpen={openFn}
                      starred={project.starredQuotes?.[n.slug]}
                    />
                  ))}
                </div>
              );
            }
          )}
        </>
      )}

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

/** aggregated overview across all shared projects (program/division scope) */
function ScopeOverview({
  data,
  onOpenProject,
}: {
  data: ShareData;
  onOpenProject: (id: string) => void;
}) {
  const { t } = useLang();
  const projects = data.projects;
  const merged = useMemo(() => mergeVaults(projects.map((p) => ({ vault: p.vault ?? undefined }))), [projects]);
  const themes = useMemo(
    () =>
      aggregateThemes(
        projects.map((p) => ({ ...p, vault: p.vault ?? undefined }))
      ).slice(0, 8),
    [projects]
  );
  const crossPP = useMemo(
    () =>
      projects
        .flatMap((p) =>
          rankPainPoints(p.vault ?? undefined).map((r) => ({ ...r, project: p }))
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, 8),
    [projects]
  );
  const sevDist = useMemo(() => severityDistribution(merged), [merged]);
  const maxSev = Math.max(1, ...sevDist.map((d) => d.count));
  const interviews = projects.reduce(
    (s, p) => s + notesOf(p.vault ?? undefined, "interview").length,
    0
  );
  const quotes = projects.reduce((s, p) => s + totalQuotes(p.vault ?? undefined), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile value={projects.length} label="Projects" />
        <StatTile value={interviews} label="Interviews" />
        <StatTile
          value={projects.reduce((s, p) => s + (p.vault?.notes.length ?? 0), 0)}
          label="Research files"
        />
        <StatTile value={quotes} label={t("Belegte Zitate")} tone="green" />
      </div>

      <section>
        <SectionTitle>{t("Projekte")}</SectionTitle>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpenProject(p.id)}
              className="elev elev-hover cursor-pointer rounded-xl border border-neutral-200 bg-white p-4 text-left"
            >
              <div className="text-sm font-bold text-neutral-900">{p.name}</div>
              <div className="mt-1 text-xs text-neutral-500">
                {[p.programName, p.method].filter(Boolean).join(" · ")} ·{" "}
                {p.vault?.notes.length ?? 0} files
              </div>
            </button>
          ))}
        </div>
      </section>

      {crossPP.length > 0 && (
        <section>
          <SectionTitle sub={t("Top-Pain-Points über alle enthaltenen Projekte, rangiert nach Severity × Confidence × Evidenz")}>
            {t("Pain-Point-Shortlist")}
          </SectionTitle>
          <div className="space-y-2">
            {crossPP.map((r, i) => (
              <button
                key={`${r.project.id}:${r.note.slug}`}
                type="button"
                onClick={() => onOpenProject(r.project.id)}
                className="elev elev-hover flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left"
              >
                <span className="w-5 shrink-0 text-sm font-extrabold text-neutral-400">
                  {i + 1}
                </span>
                <span className="min-w-[200px] flex-1">
                  <span className="block text-sm font-semibold text-neutral-800">
                    {r.note.title}
                  </span>
                  <span className="text-xs text-neutral-400">{r.project.name}</span>
                </span>
                <LevelBadge level={r.severity} prefix="Severity" />
                <ConfidenceBadge level={r.confidence} />
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sevDist.length > 0 && (
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-bold text-neutral-900">
              {t("Pain Points nach Severity")}
            </h3>
            <div className="space-y-2.5">
              {sevDist.map((d) => (
                <BarRow
                  key={d.label}
                  label={d.label}
                  count={d.count}
                  max={maxSev}
                  color={SEVERITY_COLOR[d.label] ?? "#8a8a85"}
                />
              ))}
            </div>
          </Card>
        )}
        {themes.length > 0 && (
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-bold text-neutral-900">{t("Top-Themes")}</h3>
            <div className="space-y-2">
              {themes.map((th) => (
                <div key={th.title} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800">
                    {th.title}
                  </span>
                  {th.occurrences.length > 1 && (
                    <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 ring-1 ring-indigo-200">
                      {th.occurrences.length}×
                    </span>
                  )}
                  <ConfidenceBadge level={th.maxConfidence} />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const { t } = useLang();
  const [data, setData] = useState<ShareData | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound">("loading");
  // navigation: root (scope overview | search) or a child project
  const [view, setView] = useState<"root" | "search">("root");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [jumpNote, setJumpNote] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/share?token=${encodeURIComponent(params.token)}`)
      .then(async (res) => {
        if (!res.ok) {
          setStatus("notfound");
          return;
        }
        const d: ShareData = await res.json();
        setData(d);
        setStatus("ok");
        if (d.kind === "project" && d.projects[0]) setProjectId(d.projects[0].id);
      })
      .catch(() => setStatus("notfound"));
  }, [params.token]);

  const sources: SearchSource[] = useMemo(
    () =>
      (data?.projects ?? [])
        .filter((p) => p.vault)
        .map((p) => ({ id: p.id, name: p.name, vault: p.vault ?? undefined })),
    [data]
  );

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
        {t("Lade geteilte Ergebnisse…")}
      </div>
    );
  }

  if (status === "notfound" || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <EmptyState
          title={t("Link ungültig oder widerrufen")}
          hint={t("Dieser Freigabe-Link existiert nicht mehr. Bitte eine neue Freigabe anfordern.")}
        />
      </div>
    );
  }

  const isSingleProject = data.kind === "project";
  const activeProject = projectId
    ? data.projects.find((p) => p.id === projectId)
    : undefined;

  return (
    <div className="min-h-screen">
      {/* public header */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3.5 sm:px-6">
          <Image src="/tuv-sud-logo.png" alt="TÜV SÜD" width={34} height={34} />
          <button
            type="button"
            onClick={() => {
              setView("root");
              if (!isSingleProject) setProjectId(null);
            }}
            className={`min-w-0 flex-1 text-left ${isSingleProject ? "" : "cursor-pointer"}`}
          >
            <div className="truncate text-[15px] font-bold tracking-tight text-neutral-900">
              {data.title}
            </div>
            <div className="truncate text-xs text-neutral-500">{data.subtitle}</div>
          </button>
          {(
            <button
              type="button"
              onClick={() => setView(view === "search" ? "root" : "search")}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                view === "search"
                  ? "bg-blue-50 text-[#0057b8]"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                {t("Suche")}
              </span>
            </button>
          )}
          <LangToggle compact />
          <span className="hidden rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600 ring-1 ring-neutral-200 sm:block">
            Read-only
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {view === "search" ? (
          <SearchPanel
            sources={sources}
            autoFocus
            onOpen={(sourceId, note) => {
              setJumpNote(note.slug);
              setProjectId(sourceId);
              setView("root");
            }}
          />
        ) : isSingleProject && activeProject ? (
          <ProjectView project={activeProject} initialNote={jumpNote} />
        ) : activeProject ? (
          <ProjectView
            project={activeProject}
            initialNote={jumpNote}
            onBack={() => {
              setProjectId(null);
              setJumpNote(null);
            }}
          />
        ) : (
          <ScopeOverview
            data={data}
            onOpenProject={(id) => {
              setJumpNote(null);
              setProjectId(id);
            }}
          />
        )}

        <footer className="mt-12 border-t border-neutral-200 pt-4 text-center text-xs text-neutral-400">
          TÜV SÜD · UX Research Insight Hub · {t("geteilte, schreibgeschützte Ansicht")}
        </footer>
      </div>
    </div>
  );
}
