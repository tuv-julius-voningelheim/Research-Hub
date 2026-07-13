"use client";

// Program-level consolidation: themes and pain points aggregated across all
// projects of the program, with confidence development over rounds.

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import {
  aggregateThemes,
  notesOf,
  rankPainPoints,
  totalQuotes,
} from "@/lib/analytics";
import { useHub } from "@/lib/store";
import {
  Card,
  ConfidenceBadge,
  EmptyState,
  LevelBadge,
  SectionTitle,
  StatTile,
  StatusBadge,
} from "@/components/ui";
import { FileIcon, FolderIcon, ProgramIcon, QuoteIcon, UsersIcon } from "@/components/icons";

const CONF_DOT: Record<string, string> = {
  hoch: "bg-emerald-500",
  mittel: "bg-amber-500",
  niedrig: "bg-neutral-300",
};

export default function ProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const { state, ready } = useHub();

  const program = state.programs.find((p) => p.id === params.id);
  const division = program
    ? state.divisions.find((d) => d.id === program.divisionId)
    : undefined;
  const projects = useMemo(
    () =>
      state.projects
        .filter((p) => p.programId === params.id)
        .sort((a, b) => a.createdAt - b.createdAt),
    [state.projects, params.id]
  );

  const themes = useMemo(() => aggregateThemes(projects), [projects]);
  const crossPP = useMemo(
    () =>
      projects
        .flatMap((p) =>
          rankPainPoints(p.vault).map((r) => ({ ...r, project: p }))
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, 10),
    [projects]
  );
  const stats = useMemo(
    () => ({
      files: projects.reduce((s, p) => s + (p.vault?.notes.length ?? 0), 0),
      interviews: projects.reduce(
        (s, p) => s + notesOf(p.vault, "interview").length,
        0
      ),
      quotes: projects.reduce((s, p) => s + totalQuotes(p.vault), 0),
    }),
    [projects]
  );

  if (!ready) return null;
  if (!program) {
    return (
      <EmptyState
        title="Program nicht gefunden"
        action={
          <Link href="/programs" className="text-sm font-bold text-[#004a99] hover:underline">
            ← Zurück zu Programs
          </Link>
        }
      />
    );
  }

  const recurring = themes.filter((t) => t.occurrences.length > 1);

  return (
    <div className="space-y-6">
      <Link
        href="/programs"
        className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-600 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-colors hover:bg-neutral-50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Programs
      </Link>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#004a99]">
            {ProgramIcon}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
              {program.name}
            </h1>
            <div className="text-sm text-neutral-500">
              {division?.name ?? "—"} · Konsolidierte Sicht über {projects.length}{" "}
              {projects.length === 1 ? "Projekt" : "Projekte"}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile value={projects.length} label="Projects" icon={FolderIcon} />
          <StatTile value={stats.interviews} label="Interviews" icon={UsersIcon} />
          <StatTile value={stats.files} label="Research files" icon={FileIcon} />
          <StatTile value={stats.quotes} label="Belegte Zitate" icon={QuoteIcon} tone="green" />
        </div>
      </Card>

      {/* projects of this program */}
      <section>
        <SectionTitle>Projekte (chronologisch)</SectionTitle>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card hover className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold text-neutral-900">{p.name}</div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  {p.vault
                    ? `${p.vault.notes.length} files · Upload ${new Date(p.vault.uploadedAt).toLocaleDateString("de-DE")}`
                    : "Noch kein Upload"}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* recurring themes across projects */}
      {themes.length > 0 && (
        <section>
          <SectionTitle sub="Über Projekte hinweg zusammengeführt (per Slug/Titel). Punkte zeigen die Confidence-Entwicklung je Runde — Muster sollten sich mit neuer Evidenz erhärten.">
            Themes im Programm
          </SectionTitle>
          <div className="space-y-2">
            {themes.map((t) => (
              <Card key={t.title} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1 text-sm font-semibold text-neutral-800">
                  {t.title}
                </span>
                {t.occurrences.length > 1 && (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
                    {t.occurrences.length} Projekte
                  </span>
                )}
                <span className="text-xs text-neutral-500">{t.totalQuotes} Zitate</span>
                <span className="flex items-center gap-1" title="Confidence je Projekt (chronologisch)">
                  {t.occurrences.map((o, i) => (
                    <Link
                      key={i}
                      href={`/projects/${o.projectId}?note=${encodeURIComponent(o.note.slug)}`}
                      title={`${o.projectName}: Confidence ${o.confidence}`}
                      className={`h-3 w-3 rounded-full ring-2 ring-white transition-transform hover:scale-125 ${CONF_DOT[o.confidence] ?? "bg-neutral-300"}`}
                    />
                  ))}
                </span>
                <ConfidenceBadge level={t.maxConfidence} />
              </Card>
            ))}
          </div>
          {recurring.length === 0 && projects.length > 1 && (
            <p className="mt-2 text-xs text-neutral-500">
              Noch kein Theme taucht in mehreren Projekten auf — bei künftigen Uploads
              werden wiederkehrende Muster hier zusammengeführt.
            </p>
          )}
        </section>
      )}

      {/* top pain points across the program */}
      {crossPP.length > 0 && (
        <section>
          <SectionTitle sub="Top 10 über alle Projekte, rangiert nach Severity × Confidence × Evidenz">
            Pain-Point-Shortlist des Programms
          </SectionTitle>
          <div className="space-y-2">
            {crossPP.map((r, i) => (
              <Link
                key={`${r.project.id}:${r.note.slug}`}
                href={`/projects/${r.project.id}?note=${encodeURIComponent(r.note.slug)}`}
                className="elev elev-hover flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-3"
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
              </Link>
            ))}
          </div>
        </section>
      )}

      {projects.length === 0 && (
        <EmptyState
          title="Noch keine Projekte in diesem Programm"
          hint="Lege unter Projects ein Projekt an und wähle dieses Programm."
        />
      )}
    </div>
  );
}
