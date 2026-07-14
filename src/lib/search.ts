// Full-text search across one or many vaults, with occurrence statistics
// (how often, in which projects, which note types).

import type { Note, NoteType, Vault } from "./types";

export interface SearchSource {
  id: string;
  name: string;
  vault?: Vault;
}

export interface SearchHit {
  sourceId: string;
  sourceName: string;
  note: Note;
  /** occurrences of the query in this note (title + body) */
  occurrences: number;
  titleMatch: boolean;
  snippets: string[];
}

export interface SearchStats {
  totalOccurrences: number;
  noteCount: number;
  perSource: { id: string; name: string; occurrences: number; notes: number }[];
  perType: { type: NoteType; occurrences: number; notes: number }[];
}

export interface SearchResult {
  hits: SearchHit[];
  stats: SearchStats;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function queryRegex(query: string): RegExp {
  return new RegExp(escapeRegExp(query.trim()), "giu");
}

function countMatches(text: string, re: RegExp): number {
  re.lastIndex = 0;
  let n = 0;
  while (re.exec(text)) n++;
  return n;
}

function makeSnippets(text: string, re: RegExp, max = 2): string[] {
  const clean = text.replace(/\s+/g, " ");
  const out: string[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while (out.length < max && (m = re.exec(clean))) {
    const start = Math.max(0, m.index - 70);
    const end = Math.min(clean.length, m.index + m[0].length + 110);
    out.push(
      (start > 0 ? "…" : "") + clean.slice(start, end) + (end < clean.length ? "…" : "")
    );
    // skip ahead so snippets don't overlap
    re.lastIndex = m.index + 200;
  }
  return out;
}

/** strip markdown clutter so snippets read like prose */
function cleanBody(body: string): string {
  return body
    .replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/^>\s?/gm, "„")
    .replace(/^[-*]\s+/gm, "");
}

/** hidden from search: internal/methodology notes */
const EXCLUDED_TYPES: NoteType[] = ["archive", "template", "method", "wiki", "other"];

export function searchVaults(
  sources: SearchSource[],
  query: string,
  typeFilter: NoteType | "all" = "all",
  sourceFilter: string | "all" = "all"
): SearchResult {
  const q = query.trim();
  const empty: SearchResult = {
    hits: [],
    stats: { totalOccurrences: 0, noteCount: 0, perSource: [], perType: [] },
  };
  if (q.length < 2) return empty;

  const re = queryRegex(q);
  const hits: SearchHit[] = [];
  const perSource = new Map<string, { name: string; occurrences: number; notes: number }>();
  const perType = new Map<NoteType, { occurrences: number; notes: number }>();

  for (const source of sources) {
    if (sourceFilter !== "all" && source.id !== sourceFilter) continue;
    for (const note of source.vault?.notes ?? []) {
      if (EXCLUDED_TYPES.includes(note.type)) continue;
      if (typeFilter !== "all" && note.type !== typeFilter) continue;
      const cleaned = cleanBody(note.body);
      const titleCount = countMatches(note.title, re);
      const bodyCount = countMatches(cleaned, re);
      const occurrences = titleCount + bodyCount;
      if (occurrences === 0) continue;

      hits.push({
        sourceId: source.id,
        sourceName: source.name,
        note,
        occurrences,
        titleMatch: titleCount > 0,
        snippets: bodyCount > 0 ? makeSnippets(cleaned, re) : [],
      });

      const ps = perSource.get(source.id) ?? {
        name: source.name,
        occurrences: 0,
        notes: 0,
      };
      ps.occurrences += occurrences;
      ps.notes += 1;
      perSource.set(source.id, ps);

      const pt = perType.get(note.type) ?? { occurrences: 0, notes: 0 };
      pt.occurrences += occurrences;
      pt.notes += 1;
      perType.set(note.type, pt);
    }
  }

  hits.sort(
    (a, b) =>
      Number(b.titleMatch) - Number(a.titleMatch) || b.occurrences - a.occurrences
  );

  return {
    hits: hits.slice(0, 120),
    stats: {
      totalOccurrences: hits.reduce((s, h) => s + h.occurrences, 0),
      noteCount: hits.length,
      perSource: [...perSource.entries()]
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.occurrences - a.occurrences),
      perType: [...perType.entries()]
        .map(([type, v]) => ({ type, ...v }))
        .sort((a, b) => b.occurrences - a.occurrences),
    },
  };
}
