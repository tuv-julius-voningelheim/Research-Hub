"use client";

// Print-optimized report view: clean typographic document for "Save as PDF"
// via the browser print dialog. A no-print toolbar lets the user pick which
// sections/tabs to include. Rendered without app chrome (see LayoutShell).

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  interviewMeta,
  notesOf,
  openQuestions,
  rankPainPoints,
  recTraces,
  themeSummaries,
  totalQuotes,
} from "@/lib/analytics";
import { quoteKey } from "@/lib/types";
import { effectiveVault } from "@/lib/editable";
import { divisionOf, programOf, useHub } from "@/lib/store";
import type { Note, ReportBlock, ReportPlacement } from "@/lib/types";
import RichContent from "@/components/RichContent";

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function stripWiki(s: string) {
  return s.replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, "$1").replace(/\*\*/g, "");
}

const SEV_CLS: Record<string, string> = {
  kritisch: "bg-red-50 text-red-800 ring-red-200",
  hoch: "bg-orange-50 text-orange-800 ring-orange-200",
  mittel: "bg-amber-50 text-amber-800 ring-amber-200",
  niedrig: "bg-neutral-100 text-neutral-600 ring-neutral-200",
};

const SECTIONS: { key: string; label: string; default: boolean }[] = [
  { key: "context", label: "Goals & Hypothesen", default: true },
  { key: "shortlist", label: "Priority Shortlist", default: true },
  { key: "themes", label: "Themes", default: true },
  { key: "painpoints", label: "Pain Points (alle)", default: false },
  { key: "needs", label: "Needs", default: false },
  { key: "insights", label: "Insights", default: true },
  { key: "recommendations", label: "Recommendations", default: true },
  { key: "personas", label: "Personas", default: false },
  { key: "interviews", label: "Interviews", default: false },
  { key: "questions", label: "Offene Fragen", default: true },
  { key: "requirements", label: "Requirements", default: false },
  { key: "notes", label: "Next Steps & Notizen", default: true },
];

function SectionH2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-lg font-bold text-neutral-900">{children}</h2>;
}

function ReportBlocks({ blocks, placement }: { blocks: ReportBlock[]; placement: ReportPlacement }) {
  const list = blocks.filter(
    (b) => b.placement === placement && (b.title.trim() || b.body.trim())
  );
  if (list.length === 0) return null;
  return (
    <>
      {list.map((b) => (
        <section key={b.id} className="mt-10 break-inside-avoid">
          {b.title.trim() && <SectionH2>{b.title}</SectionH2>}
          <div className="text-sm leading-relaxed text-neutral-700">
            <RichContent html={b.body} />
          </div>
        </section>
      ))}
    </>
  );
}

function QuoteBlock({ note, starred }: { note: Note; starred?: string[] }) {
  const q =
    (starred?.length
      ? note.quotes.find((x) => starred.includes(quoteKey(x.text)))
      : undefined) ?? note.quotes[0];
  if (!q) return null;
  return (
    <blockquote className="mt-2 border-l-2 border-[#0057b8] pl-3 text-sm italic leading-relaxed text-neutral-600">
      „{q.text}“
      {q.source && <span className="not-italic text-neutral-400"> — {q.source}</span>}
    </blockquote>
  );
}

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const { state, ready } = useHub();
  const project = state.projects.find((p) => p.id === params.id);
  const vault = useMemo(() => (project ? effectiveVault(project) : undefined), [project]);
  const blocks = project?.reportBlocks ?? [];

  const [on, setOn] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SECTIONS.map((s) => [s.key, s.default]))
  );

  const ranked = useMemo(() => rankPainPoints(vault), [vault]);
  const themes = useMemo(() => themeSummaries(vault), [vault]);
  const recs = useMemo(() => recTraces(vault), [vault]);
  const hidden = project?.hiddenQuestions ?? [];
  const questions = useMemo(
    () => openQuestions(vault).filter((q) => !hidden.includes(q.question)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vault, project?.hiddenQuestions]
  );

  if (!ready) return null;
  if (!project) {
    return (
      <div className="p-10 text-sm text-neutral-500">
        Projekt nicht gefunden.{" "}
        <Link href="/projects" className="text-[#0057b8] underline">
          Zurück
        </Link>
      </div>
    );
  }

  const program = programOf(state, project);
  const division = divisionOf(state, project);
  const interviews = vault ? notesOf(vault, "interview") : [];
  const needs = vault ? notesOf(vault, "need") : [];
  const insights = vault ? notesOf(vault, "insight") : [];
  const personas = vault ? notesOf(vault, "persona") : [];

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white">
      {/* toolbar (not printed) */}
      <div className="no-print sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-[860px] px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={`/projects/${project.id}`}
              className="text-sm font-semibold text-neutral-600 hover:text-neutral-900"
            >
              ← Zurück
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="cursor-pointer rounded-lg bg-[#0057b8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004a99]"
            >
              Als PDF speichern / Drucken
            </button>
          </div>
          {/* section picker */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setOn((o) => ({ ...o, [s.key]: !o[s.key] }))}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-colors ${
                  on[s.key]
                    ? "bg-blue-50 text-[#0057b8] ring-blue-200"
                    : "bg-white text-neutral-400 ring-neutral-200 hover:text-neutral-600"
                }`}
              >
                {on[s.key] ? "✓ " : ""}
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* document */}
      <article className="print-page mx-auto my-4 max-w-[860px] bg-white px-5 py-8 shadow-[0_2px_20px_rgba(16,24,40,0.08)] sm:my-8 sm:px-14 sm:py-12 print:my-0 print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <header className="border-b-2 border-[#0057b8] pb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-[#0057b8]">
                UX Research Report
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
                {project.name}
              </h1>
              <p className="mt-2 text-sm text-neutral-500">
                {[division?.name, program?.name, project.method].filter(Boolean).join(" · ")}
                {vault &&
                  ` · Export vom ${new Date(vault.uploadedAt).toLocaleDateString("de-DE")}`}
              </p>
            </div>
            <Image src="/tuv-sud-logo.png" alt="TÜV SÜD" width={56} height={56} />
          </div>
        </header>

        {!vault ? (
          <p className="mt-8 text-sm text-neutral-500">
            Noch kein Second-Brain-Export hochgeladen.
          </p>
        ) : (
          <>
            <ReportBlocks blocks={blocks} placement="top" />

            {/* key figures — always on */}
            <section className="mt-8">
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-neutral-200 ring-1 ring-neutral-200 sm:grid-cols-4">
                {[
                  [interviews.length, "Interviews"],
                  [themes.length, "Themes"],
                  [ranked.length, "Pain Points"],
                  [totalQuotes(vault), "Belegte Zitate"],
                ].map(([v, l]) => (
                  <div key={l} className="bg-white px-4 py-3 text-center">
                    <div className="text-2xl font-bold text-neutral-900">{v}</div>
                    <div className="text-xs text-neutral-500">{l}</div>
                  </div>
                ))}
              </div>
            </section>

            {on.context && ((project.goals?.length ?? 0) > 0 || (project.hypotheses?.length ?? 0) > 0 || (project.links?.length ?? 0) > 0) && (
              <section className="mt-10 break-inside-avoid">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {(project.goals?.length ?? 0) > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-neutral-900">Research Goals</h3>
                      <ul className="space-y-1.5">
                        {project.goals!.map((g, i) => (
                          <li key={i} className="flex gap-2 text-sm leading-relaxed text-neutral-700">
                            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0057b8]" />
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(project.hypotheses?.length ?? 0) > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-neutral-900">Hypothesen</h3>
                      <ul className="space-y-1.5">
                        {project.hypotheses!.map((h, i) => (
                          <li key={i} className="flex gap-2 text-sm leading-relaxed text-neutral-700">
                            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {(project.links?.length ?? 0) > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {project.links!.map((l) => (
                      <span key={l.id} className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                        {l.label || l.url}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            )}

            {on.shortlist && ranked.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-1 text-lg font-bold text-neutral-900">
                  Priority Shortlist
                </h2>
                <p className="mb-4 text-xs text-neutral-500">
                  Rangiert nach Severity × Confidence × Evidenz
                </p>
                <ol className="space-y-2.5">
                  {ranked.slice(0, 10).map((r, i) => (
                    <li key={r.note.slug} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm leading-snug text-neutral-800">
                        <span className="font-semibold">{r.note.title}</span>
                        <span className="text-neutral-500">
                          {" "}
                          — Evidenz aus {r.evidence} Interview(s)
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${SEV_CLS[r.severity] ?? SEV_CLS.niedrig}`}
                      >
                        {cap(r.severity)}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <ReportBlocks blocks={blocks} placement="after-shortlist" />

            {on.themes && themes.length > 0 && (
              <section className="mt-10">
                <SectionH2>Themes</SectionH2>
                <div className="space-y-5">
                  {themes.map((t) => (
                    <div key={t.note.slug} className="break-inside-avoid">
                      <h3 className="text-[15px] font-bold text-neutral-900">
                        {t.note.title}
                      </h3>
                      <div className="mt-0.5 text-xs text-neutral-500">
                        Confidence {cap(t.confidence)} · {t.interviewCount} Interviews ·{" "}
                        {t.quoteCount} Zitate · {t.painPoints.length} Pain Points
                      </div>
                      {t.note.sections["Definition"] && (
                        <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">
                          {stripWiki(t.note.sections["Definition"].split("\n")[0])}
                        </p>
                      )}
                      <QuoteBlock
                        note={t.note}
                        starred={project.starredQuotes?.[t.note.slug]}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <ReportBlocks blocks={blocks} placement="after-themes" />

            {on.painpoints && ranked.length > 0 && (
              <section className="mt-10">
                <SectionH2>Pain Points</SectionH2>
                <div className="space-y-4">
                  {ranked.map((r) => (
                    <div key={r.note.slug} className="break-inside-avoid">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-bold text-neutral-900">
                          {r.note.title}
                        </h3>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${SEV_CLS[r.severity] ?? SEV_CLS.niedrig}`}
                        >
                          {cap(r.severity)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-500">
                        Confidence {cap(r.confidence)} · Evidenz aus {r.evidence}{" "}
                        Interview(s)
                      </div>
                      {r.note.fields["Beschreibung"] && (
                        <p className="mt-1 text-sm leading-relaxed text-neutral-700">
                          {stripWiki(r.note.fields["Beschreibung"])}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {on.needs && needs.length > 0 && (
              <section className="mt-10">
                <SectionH2>Needs</SectionH2>
                <div className="space-y-3">
                  {needs.map((n) => (
                    <div key={n.slug} className="break-inside-avoid">
                      <h3 className="text-sm font-bold text-neutral-900">
                        {n.title}
                        {n.frontmatter["kategorie"] && (
                          <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                            {n.frontmatter["kategorie"]}
                          </span>
                        )}
                      </h3>
                      {n.fields["Beschreibung"] && (
                        <p className="mt-1 text-sm leading-relaxed text-neutral-700">
                          {stripWiki(n.fields["Beschreibung"])}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {on.insights && insights.length > 0 && (
              <section className="mt-10">
                <SectionH2>Insights</SectionH2>
                <div className="space-y-4">
                  {insights.map((n) => (
                    <div key={n.slug} className="break-inside-avoid rounded-xl bg-emerald-50/50 p-4 ring-1 ring-emerald-100">
                      <h3 className="text-sm font-bold text-neutral-900">{n.title}</h3>
                      {n.fields["Insight"] && (
                        <p className="mt-1 text-sm leading-relaxed text-neutral-700">
                          {stripWiki(n.fields["Insight"])}
                        </p>
                      )}
                      {n.fields["Business Impact"] && (
                        <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                          <span className="font-semibold">Business Impact:</span>{" "}
                          {stripWiki(n.fields["Business Impact"])}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {on.recommendations && recs.length > 0 && (
              <section className="mt-10">
                <SectionH2>Recommendations</SectionH2>
                <div className="space-y-4">
                  {recs.map((r) => (
                    <div
                      key={r.note.slug}
                      className="break-inside-avoid rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-bold text-neutral-900">
                          {r.note.title}
                        </h3>
                        <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#0057b8] ring-1 ring-blue-200">
                          Priority {cap(r.priority)}
                        </span>
                      </div>
                      {r.note.fields["Empfehlung"] && (
                        <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">
                          {stripWiki(r.note.fields["Empfehlung"])}
                        </p>
                      )}
                      {r.anchorInsight && (
                        <p className="mt-2 text-xs text-neutral-500">
                          Anker-Insight: {r.anchorInsight.title}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {on.personas && personas.length > 0 && (
              <section className="mt-10">
                <SectionH2>Personas</SectionH2>
                <div className="space-y-4">
                  {personas.map((n) => (
                    <div key={n.slug} className="break-inside-avoid">
                      <h3 className="text-sm font-bold text-neutral-900">
                        {n.title}
                        {n.frontmatter["status"] && (
                          <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600 ring-1 ring-neutral-200">
                            {n.frontmatter["status"]}
                          </span>
                        )}
                      </h3>
                      <div className="mt-0.5 text-xs text-neutral-500">
                        Segment: {n.frontmatter["segment"] ?? "—"}
                      </div>
                      {n.sections["Kontext"] && (
                        <p className="mt-1 text-sm leading-relaxed text-neutral-700">
                          {stripWiki(n.sections["Kontext"].split("\n")[0])}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {on.interviews && interviews.length > 0 && (
              <section className="mt-10 break-inside-avoid">
                <SectionH2>Interviews</SectionH2>
                <div className="overflow-hidden rounded-xl ring-1 ring-neutral-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        <th className="px-3 py-2">ID</th>
                        <th className="px-3 py-2">Segment</th>
                        <th className="px-3 py-2 text-right">Meaning Units</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interviews.map((n) => {
                        const m = interviewMeta(n);
                        return (
                          <tr key={n.slug} className="border-t border-neutral-100">
                            <td className="px-3 py-2 font-semibold text-neutral-800">
                              {m.participantId ?? n.title}
                            </td>
                            <td className="px-3 py-2 text-neutral-600">{m.segment ?? "—"}</td>
                            <td className="px-3 py-2 text-right text-neutral-600">
                              {m.meaningUnits}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {on.questions && questions.length > 0 && (
              <section className="mt-10 break-inside-avoid">
                <SectionH2>Offene Fragen &amp; Research Gaps</SectionH2>
                <ul className="space-y-1.5">
                  {questions.map((q, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed text-neutral-700">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
                      {q.question}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {on.requirements && (project.requirements?.length ?? 0) > 0 && (
              <section className="mt-10 break-inside-avoid">
                <SectionH2>Requirements Checklist</SectionH2>
                {project.requirements!.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm text-neutral-700">
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px] ${
                        r.done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-neutral-300"
                      }`}
                    >
                      {r.done ? "✓" : ""}
                    </span>
                    <span className={r.done ? "text-neutral-400 line-through" : ""}>
                      {r.text.replace(/^\[(Rec|Need)\]\s*/, "")}
                    </span>
                  </div>
                ))}
              </section>
            )}

            {on.notes && (project.nextSteps?.length || project.notes?.trim()) ? (
              <section className="mt-10 break-inside-avoid">
                <SectionH2>Next Steps &amp; Notizen</SectionH2>
                {project.nextSteps?.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm text-neutral-700">
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px] ${
                        s.done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-neutral-300"
                      }`}
                    >
                      {s.done ? "✓" : ""}
                    </span>
                    <span className={s.done ? "text-neutral-400 line-through" : ""}>
                      {s.text}
                    </span>
                  </div>
                ))}
                {project.notes?.trim() && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                    {project.notes.trim()}
                  </p>
                )}
              </section>
            ) : null}

            <ReportBlocks blocks={blocks} placement="bottom" />
          </>
        )}

        <footer className="mt-12 border-t border-neutral-200 pt-4 text-xs text-neutral-400">
          Generiert am {new Date().toLocaleDateString("de-DE")} · TÜV SÜD UX Research
          Insight Hub · programmatische Auswertung ohne KI
        </footer>
      </article>
    </div>
  );
}
