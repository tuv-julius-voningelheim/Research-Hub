"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { findingsCount } from "@/lib/analytics";
import { loadDemoVault } from "@/lib/demo";
import { divisionOf, useHub } from "@/lib/store";
import {
  Card,
  EmptyState,
  StatTile,
  StatusBadge,
  btnPrimary,
} from "@/components/ui";
import { FileIcon, FolderIcon, InsightIcon, OrgIcon } from "@/components/icons";

export default function DashboardPage() {
  const { state, ready, addDivision, addProgram, addProject, attachVault } = useHub();
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string>();

  const stats = useMemo(() => {
    const files = state.projects.reduce(
      (sum, p) => sum + (p.vault?.notes.length ?? 0),
      0
    );
    const findings = state.projects.reduce(
      (sum, p) => sum + findingsCount(p.vault),
      0
    );
    return { files, findings };
  }, [state.projects]);

  const recent = useMemo(
    () => [...state.projects].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6),
    [state.projects]
  );

  const byDivision = useMemo(() => {
    const rows = state.divisions.map((d) => {
      const programIds = state.programs
        .filter((p) => p.divisionId === d.id)
        .map((p) => p.id);
      const count = state.projects.filter((p) =>
        programIds.includes(p.programId)
      ).length;
      return { division: d, count };
    });
    const max = Math.max(1, ...rows.map((r) => r.count));
    return { rows: rows.sort((a, b) => b.count - a.count), max };
  }, [state]);

  async function seedDemo() {
    setSeeding(true);
    setError(undefined);
    try {
      const vault = await loadDemoVault();
      const division = addDivision("Product Service");
      const program = addProgram(division.id, "MACE");
      const project = addProject({
        programId: program.id,
        name: "Second Brain Test 1",
        status: "in-analysis",
        method: "User Interviews",
        description: "Beispieldaten: MACE / MHS User Interviews (Second-Brain-Export)",
      });
      attachVault(project.id, vault);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b2a6b] via-[#0b1f4e] to-[#091634] px-8 py-9 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5" />
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <h1 className="text-3xl font-extrabold tracking-tight">
              UX Research Insight Hub
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-blue-100">
              Lade Second-Brain-Exporte (ZIP) hoch — Themes, Pain Points, Needs,
              Insights und Empfehlungen werden programmatisch ausgewertet und als
              gemeinsame, nachvollziehbare Erkenntnisse aufbereitet.
            </p>
          </div>
          <Link
            href="/projects"
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-[#0b1f4e] hover:bg-blue-50"
          >
            {FolderIcon}
            View projects
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile value={state.projects.length} label="Projects" icon={FolderIcon} />
        <StatTile value={state.divisions.length} label="Divisions" icon={OrgIcon} />
        <StatTile value={stats.files} label="Research files" icon={FileIcon} />
        <StatTile
          value={stats.findings}
          label="Findings extracted"
          icon={InsightIcon}
          tone="green"
        />
      </div>

      {/* recent projects */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-neutral-900">Recent projects</h2>
        {!ready ? null : recent.length === 0 ? (
          <EmptyState
            title="Noch keine Projekte"
            hint="Lege unter Divisions → Programs → Projects deine Struktur an und lade dann einen Second-Brain-Export (ZIP) hoch. Oder starte mit den Beispieldaten."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recent.map((p) => {
              const division = divisionOf(state, p);
              return (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <Card className="p-4 transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-base font-bold text-neutral-900">
                        {p.name}
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="mt-1 text-sm text-neutral-500">
                      {division?.name ?? "—"} · {p.vault?.notes.length ?? 0} files
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
        {ready && recent.length === 0 && (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              className={btnPrimary}
              onClick={seedDemo}
              disabled={seeding}
            >
              {seeding ? "Lade Beispieldaten…" : "Beispieldaten laden (MACE)"}
            </button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        )}
      </section>

      {/* projects by division */}
      {byDivision.rows.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-neutral-900">
            Projects by division
          </h2>
          <Card className="space-y-3 p-5">
            {byDivision.rows.map(({ division, count }) => (
              <div key={division.id} className="flex items-center gap-4">
                <div className="w-44 shrink-0 truncate text-sm font-semibold text-neutral-800">
                  {division.name}
                </div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-[#0a5cd5]"
                    style={{ width: `${(count / byDivision.max) * 100}%` }}
                  />
                </div>
                <div className="w-8 text-right text-sm font-bold text-neutral-800">
                  {count}
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
