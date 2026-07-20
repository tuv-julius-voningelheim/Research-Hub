"use client";

// Division-level view — deliberately minimal: key figures, programs with
// mini stats, one aggregated severity chart and the top themes.

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  aggregateThemes,
  findingsCount,
  mergeVaults,
  notesOf,
  severityDistribution,
} from "@/lib/analytics";
import { BarRow, SEVERITY_COLOR } from "@/components/Bars";
import ShareModal from "@/components/ShareModal";
import { useLang } from "@/lib/i18n";
import { useHub } from "@/lib/store";
import {
  Card,
  Chip,
  ConfidenceBadge,
  EmptyState,
  SectionTitle,
  StatTile,
} from "@/components/ui";
import { FileIcon, FolderIcon, OrgIcon, ProgramIcon, UsersIcon } from "@/components/icons";

export default function DivisionDetailPage() {
  const params = useParams<{ id: string }>();
  const { state, ready, mode } = useHub();
  const { t } = useLang();
  const [shareOpen, setShareOpen] = useState(false);

  const division = state.divisions.find((d) => d.id === params.id);
  const programs = useMemo(
    () => state.programs.filter((p) => p.divisionId === params.id),
    [state.programs, params.id]
  );
  const projects = useMemo(() => {
    const ids = new Set(programs.map((p) => p.id));
    return state.projects.filter((p) => ids.has(p.programId));
  }, [state.projects, programs]);

  const merged = useMemo(() => mergeVaults(projects), [projects]);
  const sevDist = useMemo(() => severityDistribution(merged), [merged]);
  const topThemes = useMemo(() => aggregateThemes(projects).slice(0, 5), [projects]);
  const maxSev = Math.max(1, ...sevDist.map((d) => d.count));
  const stats = useMemo(
    () => ({
      interviews: projects.reduce((s, p) => s + notesOf(p.vault, "interview").length, 0),
      files: projects.reduce((s, p) => s + (p.vault?.notes.length ?? 0), 0),
      findings: projects.reduce((s, p) => s + findingsCount(p.vault), 0),
    }),
    [projects]
  );

  if (!ready) return null;
  if (!division) {
    return (
      <EmptyState
        title={t("Division nicht gefunden")}
        action={
          <Link href="/divisions" className="text-sm font-bold text-[#0057b8] hover:underline">
            {t("← Zurück zu Divisions")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/divisions"
        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Divisions
      </Link>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#0057b8]">
            {OrgIcon}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              {division.name}
            </h1>
            {division.description && (
              <div className="text-sm text-neutral-500">{division.description}</div>
            )}
          </div>
          {mode === "shared" && (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              <span className="inline-flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
                </svg>
                {t("Teilen")}
              </span>
            </button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatTile value={programs.length} label="Programs" icon={ProgramIcon} />
          <StatTile value={projects.length} label="Projects" icon={FolderIcon} />
          <StatTile value={stats.interviews} label="Interviews" icon={UsersIcon} />
          <StatTile value={stats.files} label="Research files" icon={FileIcon} />
          <StatTile value={stats.findings} label="Findings" tone="green" />
        </div>
      </Card>

      {/* programs */}
      <section>
        <SectionTitle>Programs</SectionTitle>
        {programs.length === 0 ? (
          <EmptyState title={t("Noch keine Programs in dieser Division")} />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {programs.map((p) => {
              const pProjects = projects.filter((pr) => pr.programId === p.id);
              return (
                <Link key={p.id} href={`/programs/${p.id}`}>
                  <Card hover className="p-4">
                    <div className="text-sm font-bold text-neutral-900">{p.name}</div>
                    <div className="mt-2 flex gap-2">
                      <Chip tone="blue">
                        {pProjects.length}{" "}
                        {pProjects.length === 1 ? "project" : "projects"}
                      </Chip>
                      <Chip>
                        {pProjects.reduce((s, pr) => s + (pr.vault?.notes.length ?? 0), 0)}{" "}
                        files
                      </Chip>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* minimal analytics */}
      {merged && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sevDist.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-4 text-sm font-bold text-neutral-900">
                {t("Pain Points nach Severity (Division)")}
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
          {topThemes.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-4 text-sm font-bold text-neutral-900">{t("Top-Themes")}</h3>
              <div className="space-y-2">
                {topThemes.map((th) => (
                  <div key={th.title} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800">
                      {th.title}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {th.totalQuotes} {t("Zitate")}
                    </span>
                    <ConfidenceBadge level={th.maxConfidence} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {shareOpen && (
        <ShareModal kind="division" targetId={division.id} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}
