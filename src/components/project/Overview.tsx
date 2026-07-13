"use client";

// Programmatic project overview: KPI row, priority shortlist (severity ×
// confidence × evidence), distributions, traceability and open questions.
// Everything is computed from the parsed vault — no AI.

import { useMemo } from "react";
import {
  byType,
  confidenceDistribution,
  needCategoryDistribution,
  openQuestions,
  rankPainPoints,
  recTraces,
  severityDistribution,
  themeSummaries,
  totalQuotes,
} from "@/lib/analytics";
import type { Note, Vault } from "@/lib/types";
import { Card, ConfidenceBadge, LevelBadge, StatTile } from "@/components/ui";
import { FlagIcon, QuoteIcon, UsersIcon } from "@/components/icons";
import { TYPE_LABEL, TypePill } from "./NoteDrawer";

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

function EvidenceDots({ n, max = 3 }: { n: number; max?: number }) {
  return (
    <span className="flex items-center gap-1" title={`${n} Interviews als Evidenz`}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${i < n ? "bg-[#0a5cd5]" : "bg-neutral-200"}`}
        />
      ))}
      {n > max && <span className="text-xs font-bold text-neutral-500">+{n - max}</span>}
    </span>
  );
}

export default function Overview({
  vault,
  onOpen,
}: {
  vault: Vault;
  onOpen: (n: Note) => void;
}) {
  const types = useMemo(() => byType(vault), [vault]);
  const ranked = useMemo(() => rankPainPoints(vault), [vault]);
  const themes = useMemo(() => themeSummaries(vault), [vault]);
  const recs = useMemo(() => recTraces(vault), [vault]);
  const questions = useMemo(() => openQuestions(vault), [vault]);
  const severityDist = useMemo(() => severityDistribution(vault), [vault]);
  const themeConf = useMemo(() => confidenceDistribution(vault, "theme"), [vault]);
  const needCats = useMemo(() => needCategoryDistribution(vault), [vault]);
  const quotes = useMemo(() => totalQuotes(vault), [vault]);

  const maxSeverity = Math.max(1, ...severityDist.map((d) => d.count));
  const maxNeed = Math.max(1, ...needCats.map((d) => d.count));
  const maxConf = Math.max(1, ...themeConf.map((d) => d.count));

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile value={types.theme.length} label="Themes" />
        <StatTile value={types["pain-point"].length} label="Pain Points" tone="orange" />
        <StatTile value={types.need.length} label="Needs" />
        <StatTile value={types.insight.length} label="Insights" tone="green" />
        <StatTile value={types.recommendation.length} label="Recommendations" tone="green" />
        <StatTile value={quotes} label="Belegte Zitate" icon={QuoteIcon} tone="neutral" />
      </div>

      {/* priority shortlist */}
      {ranked.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[#004a99]">{FlagIcon}</span>
            <h3 className="text-base font-bold text-neutral-900">Priority shortlist</h3>
            <span className="text-xs text-neutral-500">
              rangiert nach Severity × Confidence × Evidenz
            </span>
          </div>
          <div className="space-y-2">
            {ranked.slice(0, 7).map((r, i) => (
              <button
                key={r.note.slug}
                type="button"
                onClick={() => onOpen(r.note)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition-shadow hover:shadow-md"
              >
                <span className="w-5 shrink-0 text-sm font-extrabold text-neutral-400">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-semibold text-neutral-800">
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
              Pain Points nach Severity
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
              Themes nach Confidence
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
              Needs nach Kategorie
            </h3>
            <div className="space-y-2.5">
              {needCats.map((d) => (
                <BarRow key={d.label} label={d.label} count={d.count} max={maxNeed} />
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* theme map */}
      {themes.length > 0 && (
        <section>
          <h3 className="mb-3 text-base font-bold text-neutral-900">
            Themes &amp; abgeleitete Evidenz
          </h3>
          <div className="space-y-2">
            {themes.map((t) => (
              <button
                key={t.note.slug}
                type="button"
                onClick={() => onOpen(t.note)}
                className="flex w-full cursor-pointer flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition-shadow hover:shadow-md"
              >
                <span className="min-w-0 flex-1 text-sm font-semibold text-neutral-800">
                  {t.note.title}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <span className="text-neutral-400">{UsersIcon}</span>
                  {t.interviewCount} Interviews · {t.quoteCount} Zitate
                </span>
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
                  {t.painPoints.length} Pain Points
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                  {t.needs.length} Needs
                </span>
                <ConfidenceBadge level={t.confidence} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* recommendations traceability */}
      {recs.length > 0 && (
        <section>
          <h3 className="mb-1 text-base font-bold text-neutral-900">
            Recommendations &amp; Nachvollziehbarkeit
          </h3>
          <p className="mb-3 text-xs text-neutral-500">
            Jede Empfehlung ist an genau ein Anker-Insight gebunden — Evidenz bleibt bis
            zum Originalzitat rückverfolgbar.
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
                      Anker
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
                        {TYPE_LABEL[s.type] ?? s.type}: {s.slug.length > 34 ? s.slug.slice(0, 34) + "…" : s.slug}
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* open questions */}
      {questions.length > 0 && (
        <section>
          <h3 className="mb-3 text-base font-bold text-neutral-900">
            Offene Fragen &amp; Research Gaps
            <span className="ml-2 align-middle text-xs font-semibold text-neutral-400">
              {questions.length}
            </span>
          </h3>
          <Card className="divide-y divide-neutral-100">
            {questions.map((q, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 shrink-0 text-[#a35300]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
                  </svg>
                </span>
                <span className="flex-1 text-sm text-neutral-700">{q.question}</span>
                <button
                  type="button"
                  onClick={() => onOpen(q.from)}
                  className="shrink-0 cursor-pointer"
                >
                  <TypePill type={q.from.type} />
                </button>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
