"use client";

// Facet filter bar for note-list tabs (themes, pain points, needs, …).
// Derives the available severity / confidence / category / status values
// from the notes actually present and offers multi-select chips. A facet is
// only shown when it has at least two distinct values (nothing to filter
// otherwise). Filtering is AND across facets, OR within a facet.

import { useMemo } from "react";
import { useLang } from "@/lib/i18n";
import {
  categoryOf,
  confidenceOf,
  severityOf,
  type Note,
} from "@/lib/types";

export interface NoteFilterState {
  severity: string[];
  confidence: string[];
  category: string[];
  status: string[];
}

export const emptyNoteFilter: NoteFilterState = {
  severity: [],
  confidence: [],
  category: [],
  status: [],
};

export function isNoteFilterActive(f: NoteFilterState): boolean {
  return (
    f.severity.length > 0 ||
    f.confidence.length > 0 ||
    f.category.length > 0 ||
    f.status.length > 0
  );
}

function statusOf(n: Note): string | undefined {
  return n.frontmatter["status"]?.toLowerCase();
}

export function filterNotes(notes: Note[], f: NoteFilterState): Note[] {
  return notes.filter((n) => {
    if (f.severity.length && !f.severity.includes(severityOf(n) ?? "")) return false;
    if (f.confidence.length && !f.confidence.includes(confidenceOf(n) ?? "")) return false;
    if (f.category.length && !f.category.includes(categoryOf(n) ?? "")) return false;
    if (f.status.length && !f.status.includes(statusOf(n) ?? "")) return false;
    return true;
  });
}

const SEV_ORDER = ["kritisch", "hoch", "mittel", "niedrig"];
const CONF_ORDER = ["hoch", "mittel", "niedrig"];
const CAT_ORDER = ["funktional", "emotional", "sozial", "latent"];

function ordered(values: Set<string>, order: string[]): string[] {
  const known = order.filter((v) => values.has(v));
  const rest = [...values].filter((v) => !order.includes(v)).sort();
  return [...known, ...rest];
}

/** Prettify a free-form status value (e.g. "proto-persona" → "Proto-persona"). */
function prettyStatus(s: string): string {
  const t = s.replace(/[-_]+/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function NoteFilters({
  notes,
  filter,
  onChange,
}: {
  notes: Note[];
  filter: NoteFilterState;
  onChange: (f: NoteFilterState) => void;
}) {
  const { t } = useLang();
  // localized display of a normalized level/category value (hoch → High)
  const disp = (v: string) => t(v.charAt(0).toUpperCase() + v.slice(1));

  const facets = useMemo(() => {
    const sev = new Set<string>();
    const conf = new Set<string>();
    const cat = new Set<string>();
    const st = new Set<string>();
    for (const n of notes) {
      const s = severityOf(n);
      if (s) sev.add(s);
      const c = confidenceOf(n);
      if (c) conf.add(c);
      const k = categoryOf(n);
      if (k) cat.add(k);
      const status = statusOf(n);
      if (status) st.add(status);
    }
    return {
      severity: ordered(sev, SEV_ORDER),
      confidence: ordered(conf, CONF_ORDER),
      category: ordered(cat, CAT_ORDER),
      status: ordered(st, []),
    };
  }, [notes]);

  const groups: {
    key: keyof NoteFilterState;
    label: string;
    values: string[];
    display: (v: string) => string;
  }[] = [
    { key: "severity" as const, label: "Severity", values: facets.severity, display: disp },
    { key: "confidence" as const, label: "Confidence", values: facets.confidence, display: disp },
    { key: "category" as const, label: t("Kategorie"), values: facets.category, display: disp },
    { key: "status" as const, label: t("Status"), values: facets.status, display: prettyStatus },
  ].filter((g) => g.values.length >= 2);

  if (groups.length === 0) return null;

  const toggle = (key: keyof NoteFilterState, value: string) => {
    const cur = filter[key];
    const next = cur.includes(value)
      ? cur.filter((v) => v !== value)
      : [...cur, value];
    onChange({ ...filter, [key]: next });
  };

  const active = isNoteFilterActive(filter);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-neutral-200 bg-white px-4 py-3">
      {groups.map((g) => (
        <div key={g.key} className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-neutral-400">
            {g.label}
          </span>
          {g.values.map((v) => {
            const on = filter[g.key].includes(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => toggle(g.key, v)}
                aria-pressed={on}
                className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition-colors ${
                  on
                    ? "bg-[#0057b8] text-white ring-[#0057b8]"
                    : "bg-white text-neutral-600 ring-neutral-200 hover:bg-neutral-50"
                }`}
              >
                {g.display(v)}
              </button>
            );
          })}
        </div>
      ))}
      {active && (
        <button
          type="button"
          onClick={() => onChange(emptyNoteFilter)}
          className="ml-auto cursor-pointer text-xs font-semibold text-neutral-400 hover:text-neutral-700"
        >
          {t("Filter zurücksetzen")}
        </button>
      )}
    </div>
  );
}
