"use client";

// Print-optimized report view: clean typographic document for "Save as PDF"
// via the browser print dialog. Rendered without app chrome (see LayoutShell).

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import {
  notesOf,
  openQuestions,
  rankPainPoints,
  recTraces,
  themeSummaries,
  totalQuotes,
} from "@/lib/analytics";
import { divisionOf, programOf, useHub } from "@/lib/store";

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const SEV_CLS: Record<string, string> = {
  kritisch: "bg-red-50 text-red-800 ring-red-200",
  hoch: "bg-orange-50 text-orange-800 ring-orange-200",
  mittel: "bg-amber-50 text-amber-800 ring-amber-200",
  niedrig: "bg-neutral-100 text-neutral-600 ring-neutral-200",
};

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const { state, ready } = useHub();
  const project = state.projects.find((p) => p.id === params.id);
  const vault = project?.vault;

  const ranked = useMemo(() => rankPainPoints(vault), [vault]);
  const themes = useMemo(() => themeSummaries(vault), [vault]);
  const recs = useMemo(() => recTraces(vault), [vault]);
  const questions = useMemo(() => openQuestions(vault), [vault]);

  if (!ready) return null;
  if (!project) {
    return (
      <div className="p-10 text-sm text-neutral-500">
        Projekt nicht gefunden. <Link href="/projects" className="text-[#0057b8] underline">Zurück</Link>
      </div>
    );
  }

  const program = programOf(state, project);
  const division = divisionOf(state, project);
  const interviews = notesOf(vault, "interview");

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white">
      {/* toolbar (not printed) */}
      <div className="no-print sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[820px] items-center justify-between px-6 py-3">
          <Link
            href={`/projects/${project.id}`}
            className="text-sm font-semibold text-neutral-600 hover:text-neutral-900"
          >
            ← Zurück zum Projekt
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="cursor-pointer rounded-lg bg-[#0057b8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004a99]"
          >
            Als PDF speichern / Drucken
          </button>
        </div>
      </div>

      {/* document */}
      <article className="print-page mx-auto my-8 max-w-[820px] bg-white px-14 py-12 shadow-[0_2px_20px_rgba(16,24,40,0.08)] print:my-0 print:max-w-none print:px-0 print:py-0 print:shadow-none">
        {/* title */}
        <header className="border-b-2 border-[#0057b8] pb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-[#0057b8]">
                UX Research Report
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">
                {project.name}
              </h1>
              <p className="mt-2 text-sm text-neutral-500">
                {[division?.name, program?.name, project.method]
                  .filter(Boolean)
                  .join(" · ")}
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
            {/* key figures */}
            <section className="mt-8">
              <div className="grid grid-cols-4 gap-px overflow-hidden rounded-xl bg-neutral-200 ring-1 ring-neutral-200">
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

            {/* shortlist */}
            {ranked.length > 0 && (
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

            {/* themes */}
            {themes.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-4 text-lg font-bold text-neutral-900">Themes</h2>
                <div className="space-y-5">
                  {themes.map((t) => {
                    const def = t.note.sections["Definition"]?.split("\n")[0];
                    const quote = t.note.quotes[0];
                    return (
                      <div key={t.note.slug} className="break-inside-avoid">
                        <h3 className="text-[15px] font-bold text-neutral-900">
                          {t.note.title}
                        </h3>
                        <div className="mt-0.5 text-xs text-neutral-500">
                          Confidence {cap(t.confidence)} · {t.interviewCount} Interviews ·{" "}
                          {t.quoteCount} Zitate · {t.painPoints.length} Pain Points
                        </div>
                        {def && (
                          <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">
                            {def}
                          </p>
                        )}
                        {quote && (
                          <blockquote className="mt-2 border-l-2 border-[#0057b8] pl-3 text-sm italic leading-relaxed text-neutral-600">
                            „{quote.text}“
                            {quote.source && (
                              <span className="not-italic text-neutral-400"> — {quote.source}</span>
                            )}
                          </blockquote>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* recommendations */}
            {recs.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-4 text-lg font-bold text-neutral-900">
                  Recommendations
                </h2>
                <div className="space-y-4">
                  {recs.map((r) => (
                    <div key={r.note.slug} className="break-inside-avoid rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-200">
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
                          {r.note.fields["Empfehlung"].replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, "$1")}
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

            {/* open questions */}
            {questions.length > 0 && (
              <section className="mt-10 break-inside-avoid">
                <h2 className="mb-3 text-lg font-bold text-neutral-900">
                  Offene Fragen &amp; Research Gaps
                </h2>
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

            {/* next steps + notes */}
            {(project.nextSteps?.length || project.notes?.trim()) && (
              <section className="mt-10 break-inside-avoid">
                <h2 className="mb-3 text-lg font-bold text-neutral-900">
                  Next Steps &amp; Notizen
                </h2>
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
            )}
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
