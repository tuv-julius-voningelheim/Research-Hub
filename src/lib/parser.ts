import JSZip from "jszip";
import type { Note, NoteType, Quote, Vault } from "./types";

// ---------- frontmatter ----------

export function parseFrontmatter(raw: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const fm: Record<string, string> = {};
  if (!raw.startsWith("---")) return { frontmatter: fm, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { frontmatter: fm, body: raw };
  const block = raw.slice(3, end);
  for (const line of block.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) fm[m[1].toLowerCase()] = value;
  }
  const body = raw.slice(end + 4).replace(/^-*\s*\n?/, "");
  return { frontmatter: fm, body };
}

// ---------- body extraction ----------

function extractSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const parts = body.split(/^##\s+/m);
  for (let i = 1; i < parts.length; i++) {
    const nl = parts[i].indexOf("\n");
    const heading = (nl === -1 ? parts[i] : parts[i].slice(0, nl)).trim();
    const content = nl === -1 ? "" : parts[i].slice(nl + 1).trim();
    if (heading) sections[heading] = content;
  }
  return sections;
}

function extractFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const re = /^\*\*([^*:]+):?\*\*:?\s*(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const key = m[1].replace(/:$/, "").trim();
    const value = m[2].trim();
    if (key && value && !fields[key]) fields[key] = value;
  }
  return fields;
}

function extractQuotes(body: string): Quote[] {
  const quotes: Quote[] = [];
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith(">")) continue;
    // collect a contiguous blockquote
    let text = line.replace(/^>\s?/, "");
    while (i + 1 < lines.length && lines[i + 1].startsWith(">")) {
      i++;
      text += " " + lines[i].replace(/^>\s?/, "");
    }
    text = text.trim();
    if (!text) continue;
    // drop "Translation: …" continuations (derived content appended to the
    // original quote in the same blockquote — it would swallow the attribution)
    const tr = text.match(/\s+Translation:\s*["„“]/);
    if (tr && tr.index) text = text.slice(0, tr.index).trim();
    // attribution: "… — INT-001" (possibly with trailing note in parens)
    let source: string | undefined;
    const attr = text.match(/[—–]\s*([^—–]+)$/);
    if (attr && attr[1].trim().length <= 80) {
      source = attr[1].trim();
      text = text.slice(0, attr.index).trim();
    }
    // ASCII-hyphen attribution ("… " - P05") — only accept id-like sources
    // so hyphens inside the quote text are never mistaken for attribution
    if (!source) {
      const hy = text.match(
        /\s-\s+([A-Za-z]{1,8}[-_ ]?\d{1,4}(?:\s*[,&+]\s*[A-Za-z]{1,8}[-_ ]?\d{1,4})*)$/
      );
      if (hy) {
        source = hy[1].trim();
        text = text.slice(0, hy.index).trim();
      }
    }
    // meaning-unit code on the following non-quote line: "Code: #code/xyz"
    let code: string | undefined;
    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
      const cm = lines[j].match(/^Code:\s*(#code\/[\p{L}\p{N}./_-]+)/iu);
      if (cm) {
        code = cm[1];
        break;
      }
      if (lines[j].trim() && !lines[j].startsWith(">")) break;
    }
    // strip typographic quote marks
    text = text.replace(/^[„"“']+/, "").replace(/["“”']+$/, "");
    quotes.push({ text, source, code });
  }
  return quotes;
}

function extractCodes(body: string): string[] {
  const set = new Set<string>();
  // \p{L}\p{N} instead of \w so umlauts (plattformlösung, kanäle) survive
  const re = /#code\/[\p{L}\p{N}./_-]+/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) set.add(m[0]);
  return [...set];
}

function extractLinks(body: string): string[] {
  const set = new Set<string>();
  const re = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const target = m[1].trim();
    if (target) set.add(target);
  }
  return [...set];
}

function extractTitle(body: string, fallback: string): string {
  const m = body.match(/^#\s+(.+)$/m);
  if (!m) return fallback;
  return m[1]
    .replace(/^(Interview|Theme|Pain Point|Positive Pattern|Need|Insight|Recommendation|Persona)\s*:\s*/i, "")
    .trim();
}

// ---------- classification ----------

const FOLDER_TYPE: [RegExp, NoteType][] = [
  [/interview/i, "interview"],
  [/theme/i, "theme"],
  [/positive[-_ ]?pattern/i, "positive-pattern"],
  [/pain[-_ ]?point/i, "pain-point"],
  [/\bpains?\b/i, "pain-point"], // e.g. "03_pains"
  [/need/i, "need"],
  [/insight/i, "insight"],
  [/recommendation/i, "recommendation"],
  [/persona/i, "persona"],
  [/template/i, "template"],
  [/method/i, "method"],
  [/archive|archiv/i, "archive"],
];

const FM_TYPE: Record<string, NoteType> = {
  interview: "interview",
  theme: "theme",
  "pain-point": "pain-point",
  painpoint: "pain-point",
  "positive-pattern": "positive-pattern",
  positivepattern: "positive-pattern",
  need: "need",
  insight: "insight",
  recommendation: "recommendation",
  persona: "persona",
};

const TITLE_TYPE: [RegExp, NoteType][] = [
  [/^interview\b/i, "interview"],
  [/^theme\s*:/i, "theme"],
  [/^pain\s*point\s*:/i, "pain-point"],
  [/^positive\s*pattern\s*:/i, "positive-pattern"],
  [/^need\s*:/i, "need"],
  [/^insight\s*:/i, "insight"],
  [/^recommendation\s*:/i, "recommendation"],
  [/^persona\s*:/i, "persona"],
];

function classify(path: string, fm: Record<string, string>, body: string): NoteType {
  const parts = path.split("/");
  const folders = parts.slice(0, -1);
  // templates live inside a methods folder — folder wins over fm.typ there
  if (folders.some((f) => /template/i.test(f))) return "template";
  const typ = (fm["typ"] || fm["type"])?.toLowerCase();
  if (typ && FM_TYPE[typ]) return FM_TYPE[typ];
  // untyped meta/index files (_register.md, _status.md, …) are working
  // documents — keep them out of the findings and show them under Files
  if (parts[parts.length - 1].startsWith("_")) return "wiki";
  // a note filed in the wrong folder (e.g. a theme inside 07_personas)
  // usually still announces its type in the H1 — trust that before the folder
  const h1 = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (h1) {
    for (const [re, t] of TITLE_TYPE) {
      if (re.test(h1)) return t;
    }
  }
  for (const folder of folders) {
    for (const [re, t] of FOLDER_TYPE) {
      if (re.test(folder)) return t;
    }
  }
  if (folders.length === 0) return "wiki";
  return "other";
}

// ---- anonymization ----
// Participant names must not appear anywhere in the prototype (feedback).
// Replaces full names and single name tokens with the participant ID —
// everywhere except inside [[wikilinks]] (targets must keep resolving).

function anonymizeText(text: string, replacements: [RegExp, string][]): string {
  if (replacements.length === 0) return text;
  return text
    .split(/(\[\[[^\]]*\]\])/)
    .map((part) => {
      if (part.startsWith("[[")) return part;
      let out = part;
      for (const [re, id] of replacements) out = out.replace(re, id);
      return out;
    })
    .join("");
}

function buildNameReplacements(notes: Note[]): [RegExp, string][] {
  const reps: [RegExp, string][] = [];
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const n of notes) {
    if (n.type !== "interview") continue;
    const id = n.frontmatter["teilnehmer_id"] || n.frontmatter["participant_id"];
    const name = n.frontmatter["name"];
    if (!id || !name) continue;
    const tokens = name.split(/\s+/).filter((t) => t.length > 2);
    // full name first (also reversed "Bauer, Markus"), then single tokens
    if (tokens.length > 1) {
      reps.push([new RegExp(esc(name), "g"), id]);
      reps.push([new RegExp(esc([...tokens].reverse().join(", ")), "g"), id]);
    }
    for (const t of tokens) {
      reps.push([new RegExp(`(?<![\\p{L}\\p{N}])${esc(t)}(?![\\p{L}\\p{N}])`, "gu"), id]);
    }
  }
  return reps;
}

function anonymizeNotes(notes: Note[]): void {
  const reps = buildNameReplacements(notes);
  if (reps.length === 0) return;
  for (const n of notes) {
    const id = n.frontmatter["teilnehmer_id"] || n.frontmatter["participant_id"];
    if (n.type === "interview" && id) {
      n.title = `Interview ${id}`;
    } else {
      n.title = anonymizeText(n.title, reps);
    }
    n.body = anonymizeText(n.body, reps);
    for (const q of n.quotes) q.text = anonymizeText(q.text, reps);
    for (const key of Object.keys(n.fields)) {
      n.fields[key] = anonymizeText(n.fields[key], reps);
    }
    for (const key of Object.keys(n.sections)) {
      n.sections[key] = anonymizeText(n.sections[key], reps);
    }
    if (n.frontmatter["name"] && n.type === "interview" && id) {
      n.frontmatter["name"] = id;
    } else if (n.frontmatter["name"]) {
      n.frontmatter["name"] = anonymizeText(n.frontmatter["name"], reps);
    }
  }
}

// ---------- zip -> vault ----------

// raw transcripts (archive) are skipped entirely: they contain full names
// and are not needed for the evaluation (feedback: "Rohtranskripte nicht anzeigen")
const SKIP_RE =
  /(^|\/)(\.obsidian|\.github|\.git|__MACOSX)(\/|$)|\.DS_Store|(^|\/)[^/]*(archive|archiv)[^/]*\//i;

export async function parseVaultZip(file: File | Blob, fileName: string): Promise<Vault> {
  const zip = await JSZip.loadAsync(file);
  const notes: Note[] = [];
  const rootCounts = new Map<string, number>();

  const entries = Object.values(zip.files).filter((e) => {
    if (e.dir) return false;
    if (SKIP_RE.test(e.name)) return false;
    return /\.(md|txt)$/i.test(e.name);
  });

  for (const entry of entries) {
    // normalize CRLF/CR line endings — vault files come from mixed tooling,
    // and stray \r breaks heading/quote detection downstream
    const raw = (await entry.async("string")).replace(/\r\n?/g, "\n");
    // normalize path: drop a shared top-level folder later; keep as-is for now
    const path = entry.name.replace(/\\/g, "/");
    const parts = path.split("/");
    if (parts.length > 1) {
      rootCounts.set(parts[0], (rootCounts.get(parts[0]) ?? 0) + 1);
    }

    const fileBase = parts[parts.length - 1].replace(/\.(md|txt)$/i, "");
    const { frontmatter, body } = parseFrontmatter(raw);
    const isTxt = /\.txt$/i.test(path);

    const note: Note = {
      slug: fileBase,
      path,
      folder: parts.length > 1 ? parts[parts.length - 2] : "",
      type: "other",
      title: isTxt ? fileBase : extractTitle(body, frontmatter["name"] || fileBase),
      frontmatter,
      body,
      sections: isTxt ? {} : extractSections(body),
      fields: isTxt ? {} : extractFields(body),
      quotes: isTxt ? [] : extractQuotes(body),
      codes: extractCodes(body),
      links: isTxt ? [] : extractLinks(body),
    };
    notes.push(note);
  }

  if (notes.length === 0) {
    throw new Error("Keine Markdown-/Text-Dateien im ZIP gefunden.");
  }

  // vault name: the single top-level folder if all files share one
  let vaultName = fileName.replace(/\.zip$/i, "");
  if (rootCounts.size === 1 && [...rootCounts.values()][0] === notes.length) {
    vaultName = [...rootCounts.keys()][0];
    // strip the shared root from paths for classification/folder display
    for (const n of notes) {
      n.path = n.path.split("/").slice(1).join("/");
      const p = n.path.split("/");
      n.folder = p.length > 1 ? p[p.length - 2] : "";
    }
  }

  for (const n of notes) {
    n.type = classify(n.path, n.frontmatter, n.body);
    if (n.type === "other" && !n.path.includes("/")) n.type = "wiki";
  }

  // participant names must not surface anywhere in the hub
  anonymizeNotes(notes);

  // sort: by path for stable display
  notes.sort((a, b) => a.path.localeCompare(b.path, "de"));

  return {
    name: vaultName,
    uploadedAt: Date.now(),
    zipFileName: fileName,
    notes,
  };
}
