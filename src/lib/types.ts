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
}

/** stable identifier for a quote within a note (text prefix) */
export function quoteKey(text: string): string {
  return text.slice(0, 80);
}

/** read-only share link for one project's results */
export interface ShareLink {
  token: string;
  projectId: string;
  createdAt: number;
}

// ---- Parsed vault ----

export type NoteType =
  | "interview"
  | "theme"
  | "pain-point"
  | "need"
  | "insight"
  | "recommendation"
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

export function confidenceOf(n: Note): string | undefined {
  return n.frontmatter["confidence"]?.toLowerCase();
}

export function severityOf(n: Note): string | undefined {
  return n.frontmatter["severity"]?.toLowerCase();
}

export function priorityOf(n: Note): string | undefined {
  return n.frontmatter["priority"]?.toLowerCase();
}
