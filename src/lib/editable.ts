// Manual create / edit layer on top of parsed vaults.
//
// A project's "effective vault" = uploaded notes with per-slug overrides
// applied + manual notes appended − soft-hidden notes. Every consumer
// (analytics, search, report, share) reads the effective vault, so editing
// and manual creation work everywhere for free.

import type {
  EditableContent,
  ManualNote,
  Note,
  NoteOverride,
  NoteType,
  Project,
  Quote,
  Vault,
} from "./types";

export const EDITABLE_TYPES: NoteType[] = [
  "theme",
  "pain-point",
  "need",
  "insight",
  "recommendation",
  "persona",
];

export const TYPE_TITLE: Record<string, string> = {
  theme: "Theme",
  "pain-point": "Pain Point",
  need: "Need",
  insight: "Insight",
  recommendation: "Recommendation",
  persona: "Persona",
};

// ---- schema ----

export interface MetaField {
  key: string; // frontmatter key
  label: string;
  options?: string[]; // select; omit for free text
}

export interface RefField {
  key: string; // "theme" | "anchorInsight"
  label: string;
  refType: NoteType;
}

export interface TextField {
  key: string; // label used as **Label:** and note.fields key
  label: string;
  placeholder?: string;
}

interface TypeSchema {
  meta: MetaField[];
  refs: RefField[];
  fields: TextField[];
  /** the main long field (prefilled from the parsed note) */
  primary: string;
}

const CONF = ["Hoch", "Mittel", "Niedrig"];

export const SCHEMA: Record<string, TypeSchema> = {
  theme: {
    meta: [
      { key: "confidence", label: "Confidence", options: CONF },
      { key: "status", label: "Status" },
    ],
    refs: [],
    fields: [{ key: "Definition", label: "Definition", placeholder: "Was beschreibt dieses Theme?" }],
    primary: "Definition",
  },
  "pain-point": {
    meta: [
      { key: "severity", label: "Severity", options: ["Kritisch", "Hoch", "Mittel", "Niedrig"] },
      { key: "confidence", label: "Confidence", options: CONF },
    ],
    refs: [{ key: "theme", label: "Zugehöriges Theme", refType: "theme" }],
    fields: [
      { key: "Beschreibung", label: "Beschreibung" },
      { key: "Trigger", label: "Trigger" },
      { key: "Impact", label: "Impact" },
      { key: "Workaround", label: "Workaround" },
    ],
    primary: "Beschreibung",
  },
  need: {
    meta: [
      {
        key: "kategorie",
        label: "Kategorie",
        options: ["Funktional", "Emotional", "Sozial", "Latent"],
      },
    ],
    refs: [{ key: "theme", label: "Zugehöriges Theme", refType: "theme" }],
    fields: [{ key: "Beschreibung", label: "Beschreibung" }],
    primary: "Beschreibung",
  },
  insight: {
    meta: [{ key: "priority", label: "Priority", options: CONF }],
    refs: [],
    fields: [
      { key: "Insight", label: "Insight" },
      { key: "Business Impact", label: "Business Impact" },
      { key: "Design Implication", label: "Design Implication" },
    ],
    primary: "Insight",
  },
  recommendation: {
    meta: [{ key: "priority", label: "Priority", options: CONF }],
    refs: [{ key: "anchorInsight", label: "Anker-Insight", refType: "insight" }],
    fields: [
      { key: "Empfehlung", label: "Empfehlung" },
      { key: "Erwarteter Effekt", label: "Erwarteter Effekt" },
      { key: "Risiko", label: "Risiko" },
    ],
    primary: "Empfehlung",
  },
  persona: {
    meta: [
      { key: "segment", label: "Segment" },
      { key: "status", label: "Status" },
    ],
    refs: [],
    fields: [
      { key: "Kontext", label: "Kontext" },
      { key: "Ziele", label: "Ziele" },
    ],
    primary: "Kontext",
  },
};

// ---- empty / extraction ----

export function emptyEditable(type: NoteType): EditableContent {
  return { type, title: "", meta: {}, refs: {}, fields: {}, quotes: [] };
}

/** derive an editable representation from a parsed note (for the edit form) */
export function extractEditable(note: Note): EditableContent {
  const schema = SCHEMA[note.type];
  const meta: Record<string, string> = {};
  const refs: Record<string, string> = {};
  const fields: Record<string, string> = {};
  if (schema) {
    for (const m of schema.meta) {
      const v = note.frontmatter[m.key];
      if (v) meta[m.key] = v;
    }
    for (const r of schema.refs) {
      // theme via frontmatter.theme or the first link of matching type
      const fmRef = note.frontmatter[r.key];
      if (fmRef) refs[r.key] = fmRef;
    }
    for (const f of schema.fields) {
      const v = note.fields[f.key] || note.sections[f.key];
      if (v) fields[f.key] = v.trim();
    }
    // fall back: primary field from first section if nothing matched
    if (!fields[schema.primary]) {
      const firstSection = Object.values(note.sections)[0];
      if (firstSection) fields[schema.primary] = firstSection.trim();
    }
  }
  return {
    type: note.type,
    title: note.title,
    meta,
    refs,
    fields,
    quotes: note.quotes
      .filter((q) => q.text.trim())
      .map((q) => ({ text: q.text, source: q.source })),
  };
}

// ---- synthesis: EditableContent -> Note ----

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[äöü]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue" })[c] ?? c)
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function synthesizeNote(
  id: string,
  content: EditableContent,
  opts: {
    manual?: boolean;
    edited?: boolean;
    path?: string;
    folder?: string;
  } = {}
): Note {
  const frontmatter: Record<string, string> = { typ: content.type };
  for (const [k, v] of Object.entries(content.meta)) if (v) frontmatter[k] = v;
  for (const [k, v] of Object.entries(content.refs)) if (v) frontmatter[k] = v;

  const links = Object.values(content.refs).filter(Boolean);
  const quotes: Quote[] = content.quotes
    .filter((q) => q.text.trim())
    .map((q) => ({ text: q.text.trim(), source: q.source?.trim() || undefined }));

  // build a markdown body so the drawer renders naturally
  const lines: string[] = [];
  const sections: Record<string, string> = {};
  const fields: Record<string, string> = {};
  const schema = SCHEMA[content.type];
  const order = schema ? schema.fields.map((f) => f.key) : Object.keys(content.fields);
  for (const key of order) {
    const val = content.fields[key]?.trim();
    if (!val) continue;
    fields[key] = val;
    sections[key] = val;
    lines.push(`**${key}:** ${val}`, "");
  }
  if (quotes.length) {
    lines.push("## Repräsentative Zitate", "");
    for (const q of quotes) {
      lines.push(`> „${q.text}“${q.source ? ` — ${q.source}` : ""}`, "");
    }
  }

  const slug = opts.manual
    ? `manual-${id}`
    : id; // override keeps the original slug

  return {
    slug,
    path: opts.path ?? `manuell/${content.type}/${slugifyTitle(content.title) || id}.md`,
    folder: opts.folder ?? "manuell",
    type: content.type,
    title: content.title || "(ohne Titel)",
    frontmatter,
    body: lines.join("\n"),
    sections,
    fields,
    quotes,
    codes: [],
    links,
    manual: opts.manual,
    edited: opts.edited,
  };
}

// ---- effective vault ----

export function effectiveVault(project: Project): Vault | undefined {
  const base = project.vault;
  const overrides = project.overrides ?? {};
  const hidden = new Set(project.hiddenNotes ?? []);
  const manual = project.manualNotes ?? [];
  if (!base && manual.length === 0) return undefined;

  const notes: Note[] = [];
  for (const n of base?.notes ?? []) {
    if (hidden.has(n.slug)) continue;
    const ov = overrides[n.slug];
    if (ov) {
      notes.push(
        synthesizeNote(n.slug, ov.content, {
          edited: true,
          path: n.path,
          folder: n.folder,
        })
      );
    } else {
      notes.push(n);
    }
  }
  for (const m of manual) {
    notes.push(synthesizeNote(m.id, m.content, { manual: true }));
  }

  return {
    name: base?.name ?? project.name,
    uploadedAt: base?.uploadedAt ?? project.createdAt,
    zipFileName: base?.zipFileName ?? "",
    notes,
  };
}

// ---- diff (3-way) for re-upload ----

export type DiffStatus =
  | "manual-kept" // hand-created note, always kept
  | "edited-clean" // user edited, upstream unchanged → keep edit silently
  | "conflict" // user edited AND upstream changed → ask
  | "upstream-only" // uploaded, user hadn't touched → take new
  | "new" // brand new in upload
  | "removed-upstream" // user-edited note gone from new upload
  | "unchanged";

export interface DiffEntry {
  slug: string;
  type: NoteType;
  title: string;
  status: DiffStatus;
  /** for conflicts: the two candidate contents */
  mine?: EditableContent;
  theirs?: EditableContent;
}

function fieldsEqual(a: EditableContent, b: EditableContent): boolean {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

function normalize(c: EditableContent) {
  return {
    title: c.title.trim(),
    meta: c.meta,
    refs: c.refs,
    fields: Object.fromEntries(
      Object.entries(c.fields).map(([k, v]) => [k, v.trim()])
    ),
    quotes: c.quotes.map((q) => ({ text: q.text.trim(), source: q.source?.trim() })),
  };
}

/** compare current project vs a freshly parsed vault */
export function diffUpload(project: Project, next: Vault): DiffEntry[] {
  const overrides = project.overrides ?? {};
  const oldBase = new Map((project.vault?.notes ?? []).map((n) => [n.slug, n]));
  const newBase = new Map(next.notes.map((n) => [n.slug, n]));
  const entries: DiffEntry[] = [];

  // uploaded notes
  for (const [slug, newNote] of newBase) {
    if (!EDITABLE_TYPES.includes(newNote.type)) continue;
    const ov = overrides[slug];
    if (!ov) {
      entries.push({
        slug,
        type: newNote.type,
        title: newNote.title,
        status: oldBase.has(slug) ? "unchanged" : "new",
      });
      continue;
    }
    const theirs = extractEditable(newNote);
    const upstreamChanged = !fieldsEqual(theirs, ov.base);
    if (!upstreamChanged) {
      entries.push({ slug, type: newNote.type, title: newNote.title, status: "edited-clean" });
    } else {
      entries.push({
        slug,
        type: newNote.type,
        title: newNote.title,
        status: "conflict",
        mine: ov.content,
        theirs,
      });
    }
  }

  // user-edited notes removed upstream
  for (const slug of Object.keys(overrides)) {
    if (!newBase.has(slug)) {
      const c = overrides[slug].content;
      entries.push({ slug, type: c.type, title: c.title, status: "removed-upstream" });
    }
  }

  // manual notes (informational)
  for (const m of project.manualNotes ?? []) {
    entries.push({
      slug: `manual-${m.id}`,
      type: m.content.type,
      title: m.content.title,
      status: "manual-kept",
    });
  }

  const order: DiffStatus[] = [
    "conflict",
    "new",
    "removed-upstream",
    "edited-clean",
    "manual-kept",
    "upstream-only",
    "unchanged",
  ];
  return entries.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
}

/** counts for the summary bar */
export function diffSummary(entries: DiffEntry[]) {
  const c = (s: DiffStatus) => entries.filter((e) => e.status === s).length;
  return {
    conflicts: c("conflict"),
    added: c("new"),
    edited: c("edited-clean"),
    manual: c("manual-kept"),
    removed: c("removed-upstream"),
  };
}
