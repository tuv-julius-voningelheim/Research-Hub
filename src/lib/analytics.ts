// Programmatic evaluation of a parsed vault — no AI involved.
// Everything here is computed from frontmatter, links and quotes.

import {
  CONFIDENCE_ORDER,
  SEVERITY_ORDER,
  confidenceOf,
  priorityOf,
  severityOf,
  type Note,
  type NoteType,
  type Vault,
} from "./types";

export function notesOf(vault: Vault | undefined, type: NoteType): Note[] {
  return vault?.notes.filter((n) => n.type === type) ?? [];
}

export function byType(vault: Vault | undefined): Record<NoteType, Note[]> {
  const map = {
    interview: [],
    theme: [],
    "pain-point": [],
    need: [],
    insight: [],
    recommendation: [],
    persona: [],
    method: [],
    template: [],
    archive: [],
    wiki: [],
    other: [],
  } as Record<NoteType, Note[]>;
  for (const n of vault?.notes ?? []) map[n.type].push(n);
  return map;
}

export function totalQuotes(vault: Vault | undefined): number {
  return (vault?.notes ?? []).reduce((sum, n) => sum + n.quotes.length, 0);
}

/** Notes that count as extracted findings (dashboard stat). */
export function findingsCount(vault: Vault | undefined): number {
  const t = byType(vault);
  return (
    t.theme.length +
    t["pain-point"].length +
    t.need.length +
    t.insight.length +
    t.recommendation.length +
    t.persona.length
  );
}

export function slugIndex(vault: Vault | undefined): Map<string, Note> {
  const map = new Map<string, Note>();
  for (const n of vault?.notes ?? []) map.set(n.slug.toLowerCase(), n);
  return map;
}

/** All notes linking TO the given slug. */
export function backlinks(vault: Vault, slug: string): Note[] {
  const lower = slug.toLowerCase();
  return vault.notes.filter((n) =>
    n.links.some((l) => l.toLowerCase() === lower)
  );
}

// ---- pain point ranking (severity x confidence x evidence) ----

export interface RankedPainPoint {
  note: Note;
  severity: string;
  confidence: string;
  evidence: number;
  score: number;
}

function evidenceCount(n: Note): number {
  const f =
    n.fields["Evidence Count"] || n.frontmatter["evidence_count"] || "";
  const m = f.match(/\d+/);
  if (m) return parseInt(m[0], 10);
  // fall back to distinct quote sources
  const sources = new Set(n.quotes.map((q) => q.source).filter(Boolean));
  return sources.size || (n.quotes.length ? 1 : 0);
}

export function rankPainPoints(vault: Vault | undefined): RankedPainPoint[] {
  return notesOf(vault, "pain-point")
    .map((note) => {
      const severity = severityOf(note) ?? "mittel";
      const confidence = confidenceOf(note) ?? "niedrig";
      const evidence = evidenceCount(note);
      const score =
        (SEVERITY_ORDER[severity] ?? 2) * 100 +
        (CONFIDENCE_ORDER[confidence] ?? 1) * 10 +
        evidence;
      return { note, severity, confidence, evidence, score };
    })
    .sort((a, b) => b.score - a.score);
}

// ---- distributions ----

export function distribution(
  notes: Note[],
  accessor: (n: Note) => string | undefined,
  order: string[]
): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const n of notes) {
    const v = accessor(n)?.toLowerCase();
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const known = order
    .filter((k) => counts.has(k))
    .map((label) => ({ label, count: counts.get(label)! }));
  const rest = [...counts.keys()]
    .filter((k) => !order.includes(k))
    .map((label) => ({ label, count: counts.get(label)! }));
  return [...known, ...rest];
}

export const severityDistribution = (vault: Vault | undefined) =>
  distribution(notesOf(vault, "pain-point"), severityOf, [
    "kritisch",
    "hoch",
    "mittel",
    "niedrig",
  ]);

export const confidenceDistribution = (vault: Vault | undefined, type: NoteType) =>
  distribution(notesOf(vault, type), confidenceOf, ["hoch", "mittel", "niedrig"]);

export const needCategoryDistribution = (vault: Vault | undefined) =>
  distribution(
    notesOf(vault, "need"),
    (n) => n.frontmatter["kategorie"],
    ["funktional", "emotional", "sozial", "latent"]
  );

// ---- theme aggregation ----

export interface ThemeSummary {
  note: Note;
  confidence: string;
  interviewCount: number;
  quoteCount: number;
  painPoints: Note[];
  needs: Note[];
  insights: Note[];
}

export function themeSummaries(vault: Vault | undefined): ThemeSummary[] {
  if (!vault) return [];
  const themes = notesOf(vault, "theme");
  return themes
    .map((note) => {
      const lower = note.slug.toLowerCase();
      const linkedHere = (n: Note) =>
        n.links.some((l) => l.toLowerCase() === lower) ||
        n.frontmatter["theme"]?.toLowerCase() === lower;
      return {
        note,
        confidence: confidenceOf(note) ?? "niedrig",
        interviewCount:
          parseInt(note.frontmatter["interview_count"] ?? "0", 10) ||
          new Set(
            note.quotes
              .map((q) => q.source?.match(/INT-\d+/)?.[0])
              .filter(Boolean)
          ).size,
        quoteCount:
          parseInt(note.frontmatter["quote_count"] ?? "0", 10) || note.quotes.length,
        painPoints: notesOf(vault, "pain-point").filter(linkedHere),
        needs: notesOf(vault, "need").filter(linkedHere),
        insights: notesOf(vault, "insight").filter((n) =>
          note.links.some(
            (l) => l.toLowerCase() === n.slug.toLowerCase()
          ) || n.links.some((l) => l.toLowerCase() === lower)
        ),
      };
    })
    .sort(
      (a, b) =>
        (CONFIDENCE_ORDER[b.confidence] ?? 0) - (CONFIDENCE_ORDER[a.confidence] ?? 0) ||
        b.painPoints.length - a.painPoints.length
    );
}

// ---- recommendation traceability (rec -> anchor insight -> themes) ----

export interface RecTrace {
  note: Note;
  priority: string;
  anchorInsight?: Note;
  supports: Note[];
}

export function recTraces(vault: Vault | undefined): RecTrace[] {
  if (!vault) return [];
  const idx = slugIndex(vault);
  return notesOf(vault, "recommendation")
    .map((note) => {
      const linked = note.links
        .map((l) => idx.get(l.toLowerCase()))
        .filter((n): n is Note => !!n);
      return {
        note,
        priority: priorityOf(note) ?? "mittel",
        anchorInsight: linked.find((n) => n.type === "insight"),
        supports: linked.filter((n) =>
          ["theme", "pain-point", "need", "persona"].includes(n.type)
        ),
      };
    })
    .sort(
      (a, b) =>
        (CONFIDENCE_ORDER[b.priority] ?? 0) - (CONFIDENCE_ORDER[a.priority] ?? 0)
    );
}

// ---- open questions across the vault ----

export interface OpenQuestion {
  from: Note;
  question: string;
}

export function openQuestions(vault: Vault | undefined): OpenQuestion[] {
  const out: OpenQuestion[] = [];
  for (const n of vault?.notes ?? []) {
    for (const [heading, content] of Object.entries(n.sections)) {
      if (!/offene fragen|research gaps|open questions/i.test(heading)) continue;
      for (const line of content.split("\n")) {
        const m = line.match(/^\s*[-*]\s+(.+)$/);
        if (m) out.push({ from: n, question: m[1].trim() });
      }
    }
  }
  return out;
}

// ---- interview meta ----

export function interviewMeta(n: Note) {
  return {
    participantId: n.frontmatter["teilnehmer_id"] || n.frontmatter["participant_id"],
    name: n.frontmatter["name"],
    segment: n.frontmatter["segment"],
    date: n.frontmatter["datum"] || n.frontmatter["date"],
    status: n.frontmatter["status"],
    meaningUnits: n.quotes.length,
    codes: n.codes.length,
  };
}
