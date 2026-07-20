// Programmatic evaluation of a parsed vault — no AI involved.
// Everything here is computed from frontmatter, links and quotes.

import {
  CONFIDENCE_ORDER,
  SEVERITY_ORDER,
  categoryOf,
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
    "positive-pattern": [],
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
    t["positive-pattern"].length +
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
  // the evidence unit is DISTINCT INTERVIEWS — newer exports carry an
  // interview_ids list, while evidence_count there counts quotes and would
  // overstate the evidence (e.g. 14 quotes from 8 interviews)
  const ids =
    n.frontmatter["interview_ids"] || n.fields["Interview IDs"] || "";
  const idMatches = ids.match(/[A-Za-z]+[-_]?\d+/g);
  if (idMatches?.length) {
    return new Set(idMatches.map((s) => s.toUpperCase())).size;
  }
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
  distribution(notesOf(vault, "need"), categoryOf, [
    "funktional",
    "emotional",
    "sozial",
    "latent",
  ]);

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
              .map((q) => q.source?.match(/(?:INT-|P)\d+/)?.[0])
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

// ---- SOP quality checks ("Vault-Lint") ----
// Derived from the vault's own rules in 08_methods: personas need 3+
// interviews, pain points belong to exactly one theme, recommendations
// anchor to exactly one insight, confidence must match evidence.

export type LintLevel = "error" | "warning" | "info";

export interface LintFinding {
  level: LintLevel;
  rule: string;
  message: string;
  note: Note;
}

export function lintVault(vault: Vault | undefined): LintFinding[] {
  if (!vault) return [];
  const findings: LintFinding[] = [];
  const idx = slugIndex(vault);
  const themes = notesOf(vault, "theme");

  const linkedTypes = (n: Note, type: NoteType) =>
    n.links
      .map((l) => idx.get(l.toLowerCase()))
      .filter((x): x is Note => !!x && x.type === type);

  for (const n of notesOf(vault, "pain-point")) {
    const themeLinks = new Set(
      [
        ...linkedTypes(n, "theme").map((t) => t.slug.toLowerCase()),
        ...(n.frontmatter["theme"] ? [n.frontmatter["theme"].toLowerCase()] : []),
      ]
    );
    if (themeLinks.size === 0) {
      findings.push({
        level: "error",
        rule: "PP ohne Theme",
        message: "Pain Point ist keinem Theme zugeordnet (SOP: genau ein Theme).",
        note: n,
      });
    } else if (themeLinks.size > 1) {
      findings.push({
        level: "warning",
        rule: "PP mit mehreren Themes",
        message: `Pain Point verweist auf ${themeLinks.size} Themes — SOP verlangt genau eines (splitten oder Themes zusammenlegen).`,
        note: n,
      });
    }
    if (n.quotes.length === 0) {
      findings.push({
        level: "warning",
        rule: "Keine Evidenz",
        message: "Pain Point enthält kein belegtes Zitat.",
        note: n,
      });
    }
  }

  for (const n of notesOf(vault, "recommendation")) {
    const insights = linkedTypes(n, "insight");
    if (insights.length === 0) {
      findings.push({
        level: "error",
        rule: "Rec ohne Anker-Insight",
        message: "Recommendation hat kein verknüpftes Anker-Insight (SOP Schritt 9).",
        note: n,
      });
    } else if (insights.length > 1) {
      findings.push({
        level: "warning",
        rule: "Rec mit mehreren Insights",
        message: `Recommendation verweist auf ${insights.length} Insights — SOP verlangt genau ein Anker-Insight.`,
        note: n,
      });
    }
  }

  for (const n of notesOf(vault, "persona")) {
    const count =
      parseInt(n.frontmatter["anzahl_interviews"] ?? "0", 10) ||
      linkedTypes(n, "interview").length;
    const isProto = (n.frontmatter["status"] ?? "").toLowerCase().includes("proto");
    if (count < 3 && !isProto) {
      findings.push({
        level: "error",
        rule: "Persona zu früh bestätigt",
        message: `Persona basiert auf ${count} Interview(s), ist aber nicht als proto-persona markiert (SOP: erst ab 3).`,
        note: n,
      });
    } else if (count < 3) {
      findings.push({
        level: "info",
        rule: "Proto-Persona",
        message: `Proto-Persona (${count} Interview(s)) — als Hypothese behandeln.`,
        note: n,
      });
    }
  }

  for (const n of themes) {
    const conf = confidenceOf(n);
    const ic = parseInt(n.frontmatter["interview_count"] ?? "0", 10) || 0;
    if (conf === "hoch" && ic > 0 && ic < 3) {
      findings.push({
        level: "warning",
        rule: "Confidence vs. Evidenz",
        message: `Confidence „Hoch" bei nur ${ic} Interview(s) — Definition verlangt i. d. R. 3+.`,
        note: n,
      });
    }
    const lower = n.slug.toLowerCase();
    const hasPP = notesOf(vault, "pain-point").some(
      (pp) =>
        pp.links.some((l) => l.toLowerCase() === lower) ||
        pp.frontmatter["theme"]?.toLowerCase() === lower
    );
    if (!hasPP) {
      findings.push({
        level: "info",
        rule: "Theme ohne Pain Points",
        message: "Kein Pain Point verweist auf dieses Theme.",
        note: n,
      });
    }
  }

  for (const n of notesOf(vault, "insight")) {
    if (linkedTypes(n, "theme").length === 0) {
      findings.push({
        level: "warning",
        rule: "Insight ohne Themes",
        message: "Insight verweist auf keine stützenden Themes.",
        note: n,
      });
    }
  }

  const order: LintLevel[] = ["error", "warning", "info"];
  return findings.sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
}

// ---- codes index ----

export interface CodeEntry {
  code: string;
  /** meaning units (quotes) tagged with this code, with their interview */
  quotes: { note: Note; text: string; source?: string }[];
  /** non-interview notes referencing the code */
  referencedBy: Note[];
  total: number;
}

export function codesIndex(vault: Vault | undefined): CodeEntry[] {
  if (!vault) return [];
  const map = new Map<string, CodeEntry>();
  const entry = (code: string) => {
    if (!map.has(code)) {
      map.set(code, { code, quotes: [], referencedBy: [], total: 0 });
    }
    return map.get(code)!;
  };
  for (const n of vault.notes) {
    if (n.type === "interview") {
      for (const q of n.quotes) {
        if (!q.code) continue;
        const e = entry(q.code);
        e.quotes.push({
          note: n,
          text: q.text,
          source:
            n.frontmatter["teilnehmer_id"] ||
            n.frontmatter["participant_id"] ||
            n.title,
        });
      }
    } else {
      for (const c of n.codes) entry(c).referencedBy.push(n);
    }
  }
  const out = [...map.values()];
  for (const e of out) e.total = e.quotes.length + e.referencedBy.length;
  return out.sort((a, b) => b.total - a.total || a.code.localeCompare(b.code));
}

// ---- severity × confidence matrix (pain points) ----

export const MATRIX_SEVERITIES = ["kritisch", "hoch", "mittel", "niedrig"] as const;
export const MATRIX_CONFIDENCES = ["hoch", "mittel", "niedrig"] as const;

export function severityConfidenceMatrix(vault: Vault | undefined) {
  const cells = new Map<string, Note[]>();
  for (const n of notesOf(vault, "pain-point")) {
    const sev = severityOf(n) ?? "mittel";
    const conf = confidenceOf(n) ?? "niedrig";
    const key = `${sev}:${conf}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key)!.push(n);
  }
  return cells;
}

// ---- cross-project aggregation (program level) ----

export interface AggregatedTheme {
  title: string;
  /** per project (chronological): the theme note + its confidence */
  occurrences: { projectId: string; projectName: string; note: Note; confidence: string }[];
  totalQuotes: number;
  maxConfidence: string;
}

function normTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[„"“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function aggregateThemes(
  projects: { id: string; name: string; createdAt: number; vault?: Vault }[]
): AggregatedTheme[] {
  const map = new Map<string, AggregatedTheme>();
  const sorted = [...projects].sort((a, b) => a.createdAt - b.createdAt);
  for (const p of sorted) {
    for (const note of notesOf(p.vault, "theme")) {
      // match by slug first (stable across exports), then by normalized title
      const key = note.slug.toLowerCase() || normTitle(note.title);
      const existing =
        map.get(key) ??
        [...map.values()].find((t) => normTitle(t.title) === normTitle(note.title));
      const conf = confidenceOf(note) ?? "niedrig";
      if (existing) {
        existing.occurrences.push({
          projectId: p.id,
          projectName: p.name,
          note,
          confidence: conf,
        });
        existing.totalQuotes += note.quotes.length;
        if (
          (CONFIDENCE_ORDER[conf] ?? 0) >
          (CONFIDENCE_ORDER[existing.maxConfidence] ?? 0)
        ) {
          existing.maxConfidence = conf;
        }
      } else {
        map.set(key, {
          title: note.title,
          occurrences: [
            { projectId: p.id, projectName: p.name, note, confidence: conf },
          ],
          totalQuotes: note.quotes.length,
          maxConfidence: conf,
        });
      }
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      b.occurrences.length - a.occurrences.length ||
      (CONFIDENCE_ORDER[b.maxConfidence] ?? 0) - (CONFIDENCE_ORDER[a.maxConfidence] ?? 0)
  );
}

// ---- merge helper: treat several project vaults as one for distributions ----

export function mergeVaults(
  projects: { vault?: Vault }[]
): Vault | undefined {
  const notes = projects.flatMap((p) => p.vault?.notes ?? []);
  if (notes.length === 0) return undefined;
  return { name: "merged", uploadedAt: 0, zipFileName: "", notes };
}
