// Markdown report generator — same programmatic evaluation as the UI.

import {
  notesOf,
  openQuestions,
  rankPainPoints,
  recTraces,
  themeSummaries,
  totalQuotes,
} from "./analytics";
import type { Project } from "./types";

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
      vault && `**Export:** ${vault.name} (${new Date(vault.uploadedAt).toLocaleDateString("de-DE")})`,
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
  const recs = recTraces(vault);
  const questions = openQuestions(vault);

  push("## Auf einen Blick");
  push();
  push(`| | |`);
  push(`|---|---|`);
  push(`| Interviews | ${interviews.length} |`);
  push(`| Themes | ${themes.length} |`);
  push(`| Pain Points | ${ranked.length} |`);
  push(`| Needs | ${notesOf(vault, "need").length} |`);
  push(`| Insights | ${notesOf(vault, "insight").length} |`);
  push(`| Recommendations | ${recs.length} |`);
  push(`| Belegte Zitate | ${totalQuotes(vault)} |`);
  push();

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

  if (themes.length) {
    push("## Themes");
    push();
    for (const t of themes) {
      push(
        `### ${t.note.title}`
      );
      push();
      push(
        `Confidence ${cap(t.confidence)} · ${t.interviewCount} Interviews · ${t.quoteCount} Zitate · ${t.painPoints.length} Pain Points · ${t.needs.length} Needs`
      );
      const def = t.note.sections["Definition"];
      if (def) {
        push();
        push(def.split("\n")[0]);
      }
      const quote = t.note.quotes[0];
      if (quote) {
        push();
        push(`> „${quote.text}“${quote.source ? ` — ${quote.source}` : ""}`);
      }
      push();
    }
  }

  if (recs.length) {
    push("## Recommendations");
    push();
    for (const r of recs) {
      push(`### ${r.note.title}`);
      push();
      push(`Priority ${cap(r.priority)}`);
      if (r.anchorInsight) push(`Anker-Insight: ${r.anchorInsight.title}`);
      const emp = r.note.fields["Empfehlung"];
      if (emp) {
        push();
        push(emp);
      }
      push();
    }
  }

  if (questions.length) {
    push("## Offene Fragen & Research Gaps");
    push();
    for (const q of questions) push(`- ${q.question}`);
    push();
  }

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
