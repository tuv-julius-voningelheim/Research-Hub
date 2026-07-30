// Core data model of the Research Hub.
// Hierarchy: Division -> Program -> Project. A project holds one parsed
// Second-Brain vault (uploaded as ZIP, parsed fully client-side).

export type ProjectStatus = "planned" | "in-analysis" | "completed";

export interface Division {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

export interface Program {
  id: string;
  divisionId: string;
  name: string;
  description?: string;
  createdAt: number;
}

export interface NextStep {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

/** structured content used to create / edit a note (schema-driven editor) */
export interface EditableContent {
  type: NoteType;
  title: string;
  /** badge-style metadata: severity, confidence, priority, kategorie, segment, status */
  meta: Record<string, string>;
  /** relational refs (slug) e.g. theme, anchorInsight */
  refs: Record<string, string>;
  /** long text fields keyed by label (Beschreibung, Trigger, …) */
  fields: Record<string, string>;
  quotes: { text: string; source?: string }[];
}

/** an edit applied on top of an uploaded note (keyed by slug) */
export interface NoteOverride {
  content: EditableContent;
  /** snapshot of the note's editable content at edit time — for 3-way diff */
  base: EditableContent;
  editedAt: number;
}

/** a note created by hand — never removed on re-upload */
export interface ManualNote {
  id: string;
  content: EditableContent;
  createdAt: number;
  editedAt: number;
}

export interface ProjectLink {
  id: string;
  label: string;
  url: string;
}

export type ReportPlacement = "top" | "after-shortlist" | "after-themes" | "bottom";

export interface ReportBlock {
  id: string;
  title: string;
  body: string;
  placement: ReportPlacement;
}

export interface Project {
  id: string;
  programId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  method?: string;
  createdAt: number;
  vault?: Vault;
  /** free-form team notes (markdown-ish plain text) */
  notes?: string;
  nextSteps?: NextStep[];
  /** working file for the PDM team, seedable from recommendations/needs */
  requirements?: NextStep[];
  /** curated "killer quotes": note slug -> quote keys (see quoteKey()) */
  starredQuotes?: Record<string, string[]>;
  /** open questions hidden by the team (exact question text) */
  hiddenQuestions?: string[];
  /** edits on uploaded notes, keyed by slug */
  overrides?: Record<string, NoteOverride>;
  /** hand-created notes (kept across re-uploads) */
  manualNotes?: ManualNote[];
  /** soft-deleted uploaded notes (slugs) */
  hiddenNotes?: string[];
  /** research framing */
  goals?: string[];
  hypotheses?: string[];
  links?: ProjectLink[];
  /** extra report/share content blocks with placement */
  reportBlocks?: ReportBlock[];
}

/** stable identifier for a quote within a note (text prefix) */
export function quoteKey(text: string): string {
  return text.slice(0, 80);
}

export type ShareKind = "project" | "program" | "division";

/** read-only share link: one project, a whole program or a whole division */
export interface ShareLink {
  token: string;
  kind?: ShareKind;
  targetId?: string;
  /** legacy field (early links were project-only) */
  projectId?: string;
  createdAt: number;
}

export function shareKindOf(s: ShareLink): ShareKind {
  return s.kind ?? "project";
}

export function shareTargetOf(s: ShareLink): string {
  return s.targetId ?? s.projectId ?? "";
}

// ---- Parsed vault ----

export type NoteType =
  | "interview"
  | "theme"
  | "pain-point"
  | "positive-pattern"
  | "need"
  | "insight"
  | "recommendation"
  | "requirement"
  | "persona"
  | "method"
  | "template"
  | "archive"
  | "wiki"
  | "other";

export interface Quote {
  text: string;
  /** e.g. "INT-001" or free-form attribution after the em dash */
  source?: string;
  /** #code/... tag attached to the quote (interviews: meaning units) */
  code?: string;
}

export interface Note {
  /** filename without extension — target of [[wikilinks]] */
  slug: string;
  /** path inside the zip */
  path: string;
  folder: string;
  type: NoteType;
  title: string;
  frontmatter: Record<string, string>;
  /** markdown body without frontmatter */
  body: string;
  /** "## Heading" -> section content */
  sections: Record<string, string>;
  /** **Label:** value pairs found in the body */
  fields: Record<string, string>;
  quotes: Quote[];
  /** distinct #code/... tags */
  codes: string[];
  /** outgoing [[wikilinks]] (targets as written) */
  links: string[];
  /** hand-created note (not from the upload) */
  manual?: boolean;
  /** uploaded note with a manual edit applied */
  edited?: boolean;
}

export interface Vault {
  /** name of the top-level folder in the zip */
  name: string;
  uploadedAt: number;
  zipFileName: string;
  notes: Note[];
}

// ---- Convenience accessors on frontmatter ----

export const CONFIDENCE_ORDER: Record<string, number> = {
  hoch: 3,
  mittel: 2,
  niedrig: 1,
};

export const SEVERITY_ORDER: Record<string, number> = {
  kritisch: 4,
  hoch: 3,
  mittel: 2,
  niedrig: 1,
};

// Vault exports come in German ("Hoch") or English ("High") — analytics,
// matrix rows and badge colors all key on the German vocabulary, so
// normalize English values to it.
const LEVEL_MAP: Record<string, string> = {
  critical: "kritisch",
  high: "hoch",
  medium: "mittel",
  low: "niedrig",
};

export function normalizeLevel(v: string | undefined): string | undefined {
  const s = v?.trim().toLowerCase();
  if (!s) return undefined;
  return LEVEL_MAP[s] ?? s;
}

export function confidenceOf(n: Note): string | undefined {
  return normalizeLevel(n.frontmatter["confidence"]);
}

export function severityOf(n: Note): string | undefined {
  return normalizeLevel(n.frontmatter["severity"]);
}

export function priorityOf(n: Note): string | undefined {
  return normalizeLevel(n.frontmatter["priority"]);
}

const CATEGORY_MAP: Record<string, string> = {
  functional: "funktional",
  social: "sozial",
};

/** need category (kategorie/category, German or English values) */
export function categoryOf(n: Note): string | undefined {
  const raw =
    n.frontmatter["kategorie"] ||
    n.frontmatter["category"] ||
    n.fields["Kategorie"] ||
    n.fields["Category"];
  const s = raw?.trim().toLowerCase();
  if (!s) return undefined;
  return CATEGORY_MAP[s] ?? s;
}
