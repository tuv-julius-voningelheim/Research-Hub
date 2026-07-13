// Markdown report generator — always exports the FULL content of a project:
// shortlist, themes, pain points, needs, insights, recommendations, personas,
// interviews, codes, quality findings, open questions, next steps and notes.

import {
  codesIndex,
  interviewMeta,
  lintVault,
  notesOf,
  openQuestions,
  rankPainPoints,
  recTraces,
  themeSummaries,
  totalQuotes,
} from "./analytics";
import type { Note, Project } from "./types";

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function stripWiki(s: string): string {
  return s.replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, "$1");
}

function quoteLines(n: Note, limit = 3): string[] {
  return n.quotes.slice(0, limit).map(
    (q) => `> „${q.text}“${q.source ? ` — ${q.source}` : ""}`
  );
}

export function buildMarkdownReport(
  project: Project,
  context: { program?: string; division?: string }
): string {
  const vault = project.vault;
  const lines: string[] = [];
  const push = (s = "") => lines.push(s);

  push(`# ${project.name} — Research Report`);
  push();
  push(
    [
      context.division && `**Division:** ${context.division}`,
      context.program && `**Program:** ${context.program}`,
      project.method && `**Methode:** ${project.method}`,
      vault &&
        `**Export:** ${vault.name} (${new Date(vault.uploadedAt).toLocaleDateString("de-DE")})`,
    ]
      .filter(Boolean)
      .join(" · ")
  );
  push();

  if (!vault) {
    push("_Noch kein Second-Brain-Export hochgeladen._");
    return lines.join("\n");
  }

  const interviews = notesOf(vault, "interview");
  const ranked = rankPainPoints(vault);
  const themes = themeSummaries(vault);
  const needs = notesOf(vault, "need");
  const insights = notesOf(vault, "insight");
  const recs = recTraces(vault);
  const personas = notesOf(vault, "persona");
  const codes = codesIndex(vault);
  const lint = lintVault(vault);
  const questions = openQuestions(vault);

  // ---- key figures ----
  push("## Auf einen Blick");
  push();
  push(`| | |`);
  push(`|---|---|`);
  push(`| Interviews | ${interviews.length} |`);
  push(`| Themes | ${themes.length} |`);
  push(`| Pain Points | ${ranked.length} |`);
  push(`| Needs | ${needs.length} |`);
  push(`| Insights | ${insights.length} |`);
  push(`| Recommendations | ${recs.length} |`);
  push(`| Personas | ${personas.length} |`);
  push(`| Codes | ${codes.length} |`);
  push(`| Belegte Zitate | ${totalQuotes(vault)} |`);
  push();

  // ---- shortlist ----
  if (ranked.length) {
    push("## Priority Shortlist (Severity × Confidence × Evidenz)");
    push();
    ranked.slice(0, 10).forEach((r, i) => {
      push(
        `${i + 1}. **${r.note.title}** — Severity ${cap(r.severity)}, Confidence ${cap(r.confidence)}, Evidenz aus ${r.evidence} Interview(s)`
      );
    });
    push();
  }

  // ---- themes ----
  if (themes.length) {
    push("## Themes");
    push();
    for (const t of themes) {
      push(`### ${t.note.title}`);
      push();
      push(
        `Confidence ${cap(t.confidence)} · ${t.interviewCount} Interviews · ${t.quoteCount} Zitate · ${t.painPoints.length} Pain Points · ${t.needs.length} Needs`
      );
      const def = t.note.sections["Definition"];
      if (def) {
        push();
        push(stripWiki(def.split("\n")[0]));
      }
      const qs = quoteLines(t.note, 2);
      if (qs.length) {
        push();
        qs.forEach((q) => push(q));
      }
      push();
    }
  }

  // ---- pain points (all) ----
  if (ranked.length) {
    push("## Pain Points");
    push();
    for (const r of ranked) {
      push(`### ${r.note.title}`);
      push();
      push(
        `Severity ${cap(r.severity)} · Confidence ${cap(r.confidence)} · Evidenz aus ${r.evidence} Interview(s)`
      );
      const f = r.note.fields;
      for (const key of ["Beschreibung", "Trigger", "Impact", "Workaround"]) {
        if (f[key]) {
          push();
          push(`**${key}:** ${stripWiki(f[key])}`);
        }
      }
      const qs = quoteLines(r.note, 2);
      if (qs.length) {
        push();
        qs.forEach((q) => push(q));
      }
      push();
    }
  }

  // ---- needs ----
  if (needs.length) {
    push("## Needs");
    push();
    for (const n of needs) {
      push(
        `- **${n.title}**${n.frontmatter["kategorie"] ? ` _(${n.frontmatter["kategorie"]})_` : ""}${n.fields["Beschreibung"] ? ` — ${stripWiki(n.fields["Beschreibung"])}` : ""}`
      );
    }
    push();
  }

  // ---- insights ----
  if (insights.length) {
    push("## Insights");
    push();
    for (const n of insights) {
      push(`### ${n.title}`);
      push();
      if (n.fields["Insight"]) push(stripWiki(n.fields["Insight"]));
      if (n.fields["Business Impact"]) {
        push();
        push(`**Business Impact:** ${stripWiki(n.fields["Business Impact"])}`);
      }
      if (n.fields["Design Implication"]) {
        push();
        push(`**Design Implication:** ${stripWiki(n.fields["Design Implication"])}`);
      }
      push();
    }
  }

  // ---- recommendations ----
  if (recs.length) {
    push("## Recommendations");
    push();
    for (const r of recs) {
      push(`### ${r.note.title}`);
      push();
      push(`Priority ${cap(r.priority)}`);
      if (r.anchorInsight) push(`Anker-Insight: ${r.anchorInsight.title}`);
      if (r.note.fields["Empfehlung"]) {
        push();
        push(stripWiki(r.note.fields["Empfehlung"]));
      }
      if (r.note.fields["Erwarteter Effekt"]) {
        push();
        push(`**Erwarteter Effekt:** ${stripWiki(r.note.fields["Erwarteter Effekt"])}`);
      }
      if (r.note.fields["Risiko"]) {
        push();
        push(`**Risiko:** ${stripWiki(r.note.fields["Risiko"])}`);
      }
      push();
    }
  }

  // ---- personas ----
  if (personas.length) {
    push("## Personas");
    push();
    for (const n of personas) {
      push(`### ${n.title}`);
      push();
      push(
        `Segment: ${n.frontmatter["segment"] ?? "—"}${n.frontmatter["status"] ? ` · Status: ${n.frontmatter["status"]}` : ""}`
      );
      const ctx = n.sections["Kontext"];
      if (ctx) {
        push();
        push(stripWiki(ctx.split("\n")[0]));
      }
      push();
    }
  }

  // ---- interviews ----
  if (interviews.length) {
    push("## Interviews");
    push();
    push(`| ID | Name | Segment | Datum | Meaning Units |`);
    push(`|---|---|---|---|---|`);
    for (const n of interviews) {
      const m = interviewMeta(n);
      push(
        `| ${m.participantId ?? "—"} | ${m.name ?? n.title} | ${m.segment ?? "—"} | ${m.date ?? "—"} | ${m.meaningUnits} |`
      );
    }
    push();
  }

  // ---- codes ----
  if (codes.length) {
    push("## Codes (nach Häufigkeit)");
    push();
    for (const c of codes) {
      push(
        `- \`${c.code.replace("#code/", "")}\` — ${c.quotes.length} Meaning Units, ${c.referencedBy.length} Referenzen`
      );
    }
    push();
  }

  // ---- quality ----
  if (lint.length) {
    push("## Qualitätscheck (SOP-Regeln)");
    push();
    for (const f of lint) {
      const label =
        f.level === "error" ? "Verstoß" : f.level === "warning" ? "Warnung" : "Hinweis";
      push(`- **${label} — ${f.rule}:** ${f.message} _(${f.note.title})_`);
    }
    push();
  }

  // ---- open questions ----
  if (questions.length) {
    push("## Offene Fragen & Research Gaps");
    push();
    for (const q of questions) push(`- ${q.question}`);
    push();
  }

  // ---- next steps + notes ----
  if (project.nextSteps?.length) {
    push("## Next Steps");
    push();
    for (const s of project.nextSteps) push(`- [${s.done ? "x" : " "}] ${s.text}`);
    push();
  }

  if (project.notes?.trim()) {
    push("## Notizen");
    push();
    push(project.notes.trim());
    push();
  }

  push("---");
  push(
    `_Generiert am ${new Date().toLocaleDateString("de-DE")} · TÜV SÜD UX Research Insight Hub · programmatische Auswertung ohne KI_`
  );
  return lines.join("\n");
}

export function downloadTextFile(name: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
