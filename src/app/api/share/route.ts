// Public read-only access for share links. A token can scope a single
// project, a whole program or a whole division — the response contains
// exactly that scope's projects (with vaults), never the whole workspace.
// Excluded from the password gate in middleware.

import {
  StorageSuspendedError,
  readStateDoc,
  readVault,
  storeMode,
} from "@/lib/dataStore";
import { effectiveVault } from "@/lib/editable";
import type { Note, Project, Vault } from "@/lib/types";

export const dynamic = "force-dynamic";

// headings that hold open questions / research gaps (mirrors analytics.openQuestions)
const QUESTIONS_RE = /offene fragen|research gaps|open questions/i;

/** remove a level-2 markdown section from a raw note body (mirrors parser.extractSections) */
function stripQuestionSectionsFromBody(body: string): string {
  const parts = body.split(/^##\s+/m);
  const kept: string[] = [parts[0]];
  for (let i = 1; i < parts.length; i++) {
    const nl = parts[i].indexOf("\n");
    const heading = (nl === -1 ? parts[i] : parts[i].slice(0, nl)).trim();
    if (QUESTIONS_RE.test(heading)) continue;
    kept.push("## " + parts[i]);
  }
  return kept.join("");
}

/** drop open-questions/research-gaps content so it is never transferred to a share link */
function stripOpenQuestions(vault: Vault | null): Vault | null {
  if (!vault) return vault;
  return {
    ...vault,
    notes: vault.notes.map((n: Note) => {
      let touched = false;
      const sections: Record<string, string> = {};
      for (const [heading, content] of Object.entries(n.sections)) {
        if (QUESTIONS_RE.test(heading)) {
          touched = true;
          continue;
        }
        sections[heading] = content;
      }
      if (!touched) return n;
      return { ...n, sections, body: stripQuestionSectionsFromBody(n.body) };
    }),
  };
}

interface StoredProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  method?: string;
  programId: string;
  createdAt: number;
  hasVault?: boolean;
  starredQuotes?: Record<string, string[]>;
  hiddenQuestions?: string[];
  goals?: string[];
  hypotheses?: string[];
  links?: { id: string; label: string; url: string }[];
  reportBlocks?: { id: string; title: string; body: string; placement: string }[];
}

interface StoredState {
  shares?: {
    token: string;
    kind?: "project" | "program" | "division";
    targetId?: string;
    projectId?: string;
    hideQuestions?: boolean;
  }[];
  projects?: StoredProject[];
  programs?: { id: string; name: string; divisionId: string }[];
  divisions?: { id: string; name: string; description?: string }[];
}

export async function GET(req: Request) {
  if (storeMode() === "none") {
    return new Response(JSON.stringify({ error: "storage-not-configured" }), {
      status: 501,
      headers: { "content-type": "application/json" },
    });
  }
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!/^[a-z0-9]{16,64}$/i.test(token)) {
    return new Response(null, { status: 404 });
  }

  let state: StoredState | null;
  try {
    state = (await readStateDoc()).data as StoredState | null;
  } catch (e) {
    if (e instanceof StorageSuspendedError) {
      return new Response(JSON.stringify({ error: "storage-suspended" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    }
    throw e;
  }
  if (!state) return new Response(null, { status: 404 });

  const share = (state.shares ?? []).find((s) => s.token === token);
  if (!share) return new Response(null, { status: 404 });

  const kind = share.kind ?? "project";
  const targetId = share.targetId ?? share.projectId ?? "";
  const programs = state.programs ?? [];
  const divisions = state.divisions ?? [];
  const allProjects = state.projects ?? [];

  // resolve scope
  let title = "";
  let subtitle = "";
  let scopedPrograms: { id: string; name: string }[] = [];
  let scopedProjects: StoredProject[] = [];

  if (kind === "project") {
    const project = allProjects.find((p) => p.id === targetId);
    if (!project) return new Response(null, { status: 404 });
    const program = programs.find((p) => p.id === project.programId);
    const division = program
      ? divisions.find((d) => d.id === program.divisionId)
      : undefined;
    title = project.name;
    subtitle = [division?.name, program?.name, project.method]
      .filter(Boolean)
      .join(" · ");
    scopedProjects = [project];
    if (program) scopedPrograms = [{ id: program.id, name: program.name }];
  } else if (kind === "program") {
    const program = programs.find((p) => p.id === targetId);
    if (!program) return new Response(null, { status: 404 });
    const division = divisions.find((d) => d.id === program.divisionId);
    title = program.name;
    subtitle = [division?.name, "Program"].filter(Boolean).join(" · ");
    scopedPrograms = [{ id: program.id, name: program.name }];
    scopedProjects = allProjects.filter((p) => p.programId === program.id);
  } else {
    const division = divisions.find((d) => d.id === targetId);
    if (!division) return new Response(null, { status: 404 });
    title = division.name;
    subtitle = "Division";
    scopedPrograms = programs
      .filter((p) => p.divisionId === division.id)
      .map((p) => ({ id: p.id, name: p.name }));
    const programIds = new Set(scopedPrograms.map((p) => p.id));
    scopedProjects = allProjects.filter((p) => programIds.has(p.programId));
  }

  const projects = await Promise.all(
    scopedProjects.map(async (p) => {
      const rawVault = p.hasVault
        ? ((await readVault(p.id)) as Vault | null)
        : null;
      // apply manual edits / manual notes / soft-hides server-side
      let vault =
        effectiveVault({ ...(p as unknown as Project), vault: rawVault ?? undefined }) ?? null;
      // optionally never transfer open questions / research gaps
      if (share.hideQuestions) vault = stripOpenQuestions(vault);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        method: p.method,
        programId: p.programId,
        programName: programs.find((x) => x.id === p.programId)?.name,
        createdAt: p.createdAt,
        starredQuotes: p.starredQuotes ?? {},
        hiddenQuestions: p.hiddenQuestions ?? [],
        goals: p.goals ?? [],
        hypotheses: p.hypotheses ?? [],
        links: p.links ?? [],
        reportBlocks: p.reportBlocks ?? [],
        vault,
      };
    })
  );

  return Response.json(
    { kind, title, subtitle, programs: scopedPrograms, projects },
    { headers: { "cache-control": "no-store" } }
  );
}
