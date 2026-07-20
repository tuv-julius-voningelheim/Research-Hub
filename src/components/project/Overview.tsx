"use client";

// Programmatic project overview: KPI row, priority shortlist (severity ×
// confidence × evidence), distributions, traceability and open questions.
// Everything is computed from the parsed vault — no AI.

import { Fragment, useMemo, useState } from "react";
import {
  MATRIX_CONFIDENCES,
  MATRIX_SEVERITIES,
  byType,
  confidenceDistribution,
  needCategoryDistribution,
  openQuestions,
  rankPainPoints,
  recTraces,
  severityConfidenceMatrix,
  severityDistribution,
  themeSummaries,
  totalQuotes,
} from "@/lib/analytics";
import { useLang } from "@/lib/i18n";
import type { Note, ProjectLink, ReportBlock, Vault } from "@/lib/types";
import { Card, ConfidenceBadge, LevelBadge, Modal, StatTile } from "@/components/ui";
import { FlagIcon, QuoteIcon, UsersIcon } from "@/components/icons";
import RichContent from "@/components/RichContent";
import { TYPE_LABEL, TypePill } from "./NoteDrawer";

export interface OverviewContext {
  goals?: string[];
  hypotheses?: string[];
  links?: ProjectLink[];
}

function ReportBlockView({ block }: { block: ReportBlock }) {
  if (!block.title.trim() && !block.body.trim()) return null;
  return (
    <Card className="p-5">
      {block.title.trim() && (
        <h3 className="mb-2 text-base font-bold tracking-tight text-neutral-900">
          {block.title}
        </h3>
      )}
      <div className="text-sm text-neutral-700">
        <RichContent html={block.body} />
      </div>
    </Card>
  );
}

function ContextCard({ context }: { context: OverviewContext }) {
  const { t } = useLang();
  const { goals = [], hypotheses = [], links = [] } = context;
  if (goals.length === 0 && hypotheses.length === 0 && links.length === 0) return null;
  return (
    <Card className="p-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {goals.length > 0 && (
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-neutral-900">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0057b8" strokeWidth="2">
                <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" />
              </svg>
              Research Goals
            </h3>
            <ul className="space-y-1.5">
              {goals.map((g, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-neutral-700">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0057b8]" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        )}
        {hypotheses.length > 0 && (
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-neutral-900">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0057b8" strokeWidth="2">
                <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z" />
              </svg>
              {t("Hypothesen")}
            </h3>
            <ul className="space-y-1.5">
              {hypotheses.map((h, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-neutral-700">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {links.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
          {links.map((l) => (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-200"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
              </svg>
              {l.label || l.url}
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}

// status ramp for severity (state, not identity — always labeled)
const SEVERITY_COLOR: Record<string, string> = {
  kritisch: "#b3261e",
  hoch: "#c4540a",
  mittel: "#a37200",
  niedrig: "#8a8a85",
};

function BarRow({
  label,
  count,
  max,
  color = "#0a5cd5",
}: {
  label: string;
  count: number;
  max: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 shrink-0 text-sm font-semibold capitalize text-neutral-700">
        {label}
      </div>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${(count / Math.max(1, max)) * 100}%`, background: color }}
        />
      </div>
      <div className="w-6 text-right text-sm font-bold text-neutral-800">{count}</div>
    </div>
  );
}

function EvidenceDots({ n, max = 5 }: { n: number; max?: number }) {
  const { tf } = useLang();
  // stays compact even for high evidence counts (feedback: 6+ broke the layout)
  return (
    <span
      className="flex shrink-0 items-center gap-1"
      title={tf("Evidenz aus {n} Interview(s)", { n })}
    >
      {Array.from({ length: Math.min(n, max) || 1 }).map((_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${i < n ? "bg-[#0057b8]" : "bg-neutral-200"}`}
        />
      ))}
      {n > max && (
        <span className="text-[11px] font-bold text-neutral-500">+{n - max}</span>
      )}
    </span>
  );
}

export default function Overview({
  vault,
  onOpen,
  curation,
  context,
  reportBlocks,
}: {
  vault: Vault;
  onOpen: (n: Note) => void;
  /** optional team curation: hide noisy open questions (app only) */
  curation?: {
    hiddenQuestions?: string[];
    onToggleQuestion?: (question: string) => void;
  };
  context?: OverviewContext;
  reportBlocks?: ReportBlock[];
}) {
  const { t } = useLang();
  const topBlocks = (reportBlocks ?? []).filter((b) => b.placement === "top");
  const laterBlocks = (reportBlocks ?? []).filter((b) => b.placement !== "top");
  const types = useMemo(() => byType(vault), [vault]);
  const ranked = useMemo(() => rankPainPoints(vault), [vault]);
  const themes = useMemo(() => themeSummaries(vault), [vault]);
  const recs = useMemo(() => recTraces(vault), [vault]);
  const questions = useMemo(() => openQuestions(vault), [vault]);
  const severityDist = useMemo(() => severityDistribution(vault), [vault]);
  const themeConf = useMemo(() => confidenceDistribution(vault, "theme"), [vault]);
  const needCats = useMemo(() => needCategoryDistribution(vault), [vault]);
  const quotes = useMemo(() => totalQuotes(vault), [vault]);
  const matrix = useMemo(() => severityConfidenceMatrix(vault), [vault]);
  const matrixMax = Math.max(1, ...[...matrix.values()].map((v) => v.length));
  const [matrixCell, setMatrixCell] = useState<{ label: string; notes: Note[] } | null>(
    null
  );

  const hiddenQuestions = curation?.hiddenQuestions ?? [];
  const visibleQuestions = questions.filter(
    (q) => !hiddenQuestions.includes(q.question)
  );
  const hiddenCount = questions.length - visibleQuestions.length;
  const [showHidden, setShowHidden] = useState(false);

  const maxSeverity = Math.max(1, ...severityDist.map((d) => d.count));
  const maxNeed = Math.max(1, ...needCats.map((d) => d.count));
  const maxConf = Math.max(1, ...themeConf.map((d) => d.count));

  return (
    <div className="space-y-6">
      {context && <ContextCard context={context} />}
      {topBlocks.map((b) => (
        <ReportBlockView key={b.id} block={b} />
      ))}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile value={types.theme.length} label="Themes" />
        <StatTile value={types["pain-point"].length} label="Pain Points" tone="orange" />
        <StatTile value={types.need.length} label="Needs" />
        <StatTile value={types.insight.length} label="Insights" tone="green" />
        <StatTile value={types.recommendation.length} label="Recommendations" tone="green" />
        <StatTile value={quotes} label={t("Belegte Zitate")} icon={QuoteIcon} tone="neutral" />
      </div>

      {/* priority shortlist */}
      {ranked.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[#004a99]">{FlagIcon}</span>
            <h3 className="text-base font-bold text-neutral-900">Priority shortlist</h3>
            <span className="text-xs text-neutral-500">
              {t("rangiert nach Severity × Confidence × Evidenz")}
            </span>
          </div>
          <div className="space-y-2">
            {ranked.slice(0, 7).map((r, i) => (
              <button
                key={r.note.slug}
                type="button"
                onClick={() => onOpen(r.note)}
                className="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition-shadow hover:shadow-md"
              >
                <span className="w-5 shrink-0 text-sm font-extrabold text-neutral-400">
                  {i + 1}
                </span>
                <span className="min-w-[200px] flex-1 text-sm font-semibold text-neutral-800">
                  {r.note.title}
                </span>
                <LevelBadge level={r.severity} prefix="Severity" />
                <ConfidenceBadge level={r.confidence} />
                <EvidenceDots n={r.evidence} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* distributions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {severityDist.length > 0 && (
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-bold text-neutral-900">
              {t("Pain Points nach Severity")}
            </h3>
            <div className="space-y-2.5">
              {severityDist.map((d) => (
                <BarRow
                  key={d.label}
                  label={d.label}
                  count={d.count}
                  max={maxSeverity}
                  color={SEVERITY_COLOR[d.label] ?? "#8a8a85"}
                />
              ))}
            </div>
          </Card>
        )}
        {themeConf.length > 0 && (
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-bold text-neutral-900">
              {t("Themes nach Confidence")}
            </h3>
            <div className="space-y-2.5">
              {themeConf.map((d, i) => (
                <BarRow
                  key={d.label}
                  label={d.label}
                  count={d.count}
                  max={maxConf}
                  color={["#104281", "#2a78d6", "#86b6ef"][i] ?? "#86b6ef"}
                />
              ))}
            </div>
          </Card>
        )}
        {needCats.length > 0 && (
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-bold text-neutral-900">
              {t("Needs nach Kategorie")}
            </h3>
            <div className="space-y-2.5">
              {needCats.map((d) => (
                <BarRow key={d.label} label={d.label} count={d.count} max={maxNeed} />
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* severity × confidence matrix (heatmap, sequential blue) */}
      {matrix.size > 0 && (
        <Card className="p-5">
          <h3 className="mb-1 text-sm font-bold text-neutral-900">
            {t("Risiko-Matrix: Severity × Confidence")}
          </h3>
          <p className="mb-4 text-xs text-neutral-500">
            {t("Pain Points — oben links = dringend UND gut belegt.")}
          </p>
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[560px] gap-1.5"
              style={{ gridTemplateColumns: `90px repeat(${MATRIX_CONFIDENCES.length}, 1fr)` }}
            >
              <div />
              {MATRIX_CONFIDENCES.map((c) => (
                <div
                  key={c}
                  className="pb-1 text-center text-xs font-bold capitalize text-neutral-500"
                >
                  Confidence {t(c.charAt(0).toUpperCase() + c.slice(1))}
                </div>
              ))}
              {MATRIX_SEVERITIES.map((sev) => (
                <Fragment key={sev}>
                  <div className="flex items-center text-xs font-bold capitalize text-neutral-500">
                    {t(sev.charAt(0).toUpperCase() + sev.slice(1))}
                  </div>
                  {MATRIX_CONFIDENCES.map((conf) => {
                    const notes = matrix.get(`${sev}:${conf}`) ?? [];
                    const intensity = notes.length / matrixMax;
                    // sequential blue ramp; text switches to white on dark cells
                    const bg =
                      notes.length === 0
                        ? "#f4f5f7"
                        : intensity > 0.66
                          ? "#1c5cab"
                          : intensity > 0.33
                            ? "#5598e7"
                            : "#b7d3f6";
                    const fg = intensity > 0.66 && notes.length > 0 ? "#fff" : "#1a2b45";
                    return (
                      <button
                        key={conf}
                        type="button"
                        disabled={notes.length === 0}
                        onClick={() =>
                          setMatrixCell({
                            label: `Severity ${sev} × Confidence ${conf}`,
                            notes,
                          })
                        }
                        title={notes.map((n) => n.title).join("\n")}
                        className={`flex h-14 items-center justify-center rounded-xl text-base font-extrabold transition-transform ${
                          notes.length > 0 ? "cursor-pointer hover:scale-[1.03]" : ""
                        }`}
                        style={{ background: bg, color: fg }}
                      >
                        {notes.length > 0 ? notes.length : ""}
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* theme map */}
      {themes.length > 0 && (
        <section>
          <h3 className="mb-3 text-base font-bold text-neutral-900">
            {t("Themes & abgeleitete Evidenz")}
          </h3>
          <div className="space-y-2">
            {themes.map((th) => (
              <button
                key={th.note.slug}
                type="button"
                onClick={() => onOpen(th.note)}
                className="flex w-full cursor-pointer flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition-shadow hover:shadow-md"
              >
                <span className="min-w-0 flex-1 text-sm font-semibold text-neutral-800">
                  {th.note.title}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <span className="text-neutral-400">{UsersIcon}</span>
                  {th.interviewCount} Interviews · {th.quoteCount} {t("Zitate")}
                </span>
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
                  {th.painPoints.length} Pain Points
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                  {th.needs.length} Needs
                </span>
                <ConfidenceBadge level={th.confidence} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* recommendations traceability */}
      {recs.length > 0 && (
        <section>
          <h3 className="mb-1 text-base font-bold text-neutral-900">
            {t("Recommendations & Nachvollziehbarkeit")}
          </h3>
          <p className="mb-3 text-xs text-neutral-500">
            {t("Jede Empfehlung ist an genau ein Anker-Insight gebunden — Evidenz bleibt bis zum Originalzitat rückverfolgbar.")}
          </p>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {recs.map((r) => (
              <Card key={r.note.slug} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(r.note)}
                    className="cursor-pointer text-left text-sm font-bold text-neutral-900 hover:text-[#004a99]"
                  >
                    {r.note.title}
                  </button>
                  <LevelBadge level={r.priority} prefix="Priority" />
                </div>
                {r.anchorInsight && (
                  <button
                    type="button"
                    onClick={() => onOpen(r.anchorInsight!)}
                    className="mt-2 flex w-full cursor-pointer items-center gap-2 rounded-lg bg-emerald-50/70 px-3 py-2 text-left text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100 hover:bg-emerald-100/70"
                  >
                    <span className="shrink-0 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                      {t("Anker")}
                    </span>
                    {r.anchorInsight.title}
                  </button>
                )}
                {r.supports.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.supports.map((s) => (
                      <button
                        key={s.slug}
                        type="button"
                        onClick={() => onOpen(s)}
                        title={s.title}
                        className="cursor-pointer rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-200"
                      >
                        {t(TYPE_LABEL[s.type] ?? s.type)}: {s.slug.length > 34 ? s.slug.slice(0, 34) + "…" : s.slug}
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* open questions — hidable per team curation */}
      {questions.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3 className="text-base font-bold text-neutral-900">
              {t("Offene Fragen & Research Gaps")}
              <span className="ml-2 align-middle text-xs font-semibold text-neutral-400">
                {visibleQuestions.length}
              </span>
            </h3>
            {hiddenCount > 0 && curation?.onToggleQuestion && (
              <button
                type="button"
                onClick={() => setShowHidden((v) => !v)}
                className="cursor-pointer text-xs font-semibold text-neutral-400 hover:text-neutral-600"
              >
                {showHidden ? t("Ausgeblendete verbergen") : `${hiddenCount} ${t("ausgeblendet — anzeigen")}`}
              </button>
            )}
          </div>
          <Card className="divide-y divide-neutral-100">
            {(showHidden ? questions : visibleQuestions).map((q, i) => {
              const isHidden = hiddenQuestions.includes(q.question);
              return (
                <div
                  key={i}
                  className={`group/oq flex items-start gap-3 px-4 py-3 ${isHidden ? "opacity-45" : ""}`}
                >
                  <span className="mt-0.5 shrink-0 text-[#a35300]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
                    </svg>
                  </span>
                  <span className="flex-1 text-sm text-neutral-700">{q.question}</span>
                  {curation?.onToggleQuestion && (
                    <button
                      type="button"
                      title={isHidden ? t("Frage wieder einblenden") : t("Frage ausblenden")}
                      onClick={() => curation.onToggleQuestion?.(q.question)}
                      className={`shrink-0 cursor-pointer rounded-md p-1 transition-all ${
                        isHidden
                          ? "text-neutral-400 hover:text-neutral-700"
                          : "text-neutral-300 opacity-0 hover:text-neutral-600 group-hover/oq:opacity-100"
                      }`}
                    >
                      {isHidden ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 8 10 8a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" />
                        </svg>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpen(q.from)}
                    className="shrink-0 cursor-pointer"
                  >
                    <TypePill type={q.from.type} />
                  </button>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {laterBlocks.map((b) => (
        <ReportBlockView key={b.id} block={b} />
      ))}

      {/* matrix cell picker */}
      {matrixCell && (
        <Modal title={matrixCell.label} onClose={() => setMatrixCell(null)}>
          <div className="space-y-1.5">
            {matrixCell.notes.map((n) => (
              <button
                key={n.slug}
                type="button"
                onClick={() => {
                  setMatrixCell(null);
                  onOpen(n);
                }}
                className="block w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-neutral-800 ring-1 ring-neutral-200 transition-colors hover:bg-blue-50/60 hover:ring-blue-200"
              >
                {n.title}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
