// Public read-only access for share links: validates the token against the
// stored workspace and returns exactly one project's results (never the
// whole workspace). Excluded from the password gate in middleware.

import {
  STATE_DIR,
  STATE_LEGACY,
  readLatestJson,
  vaultDir,
  vaultLegacy,
} from "@/lib/blobStore";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new Response(JSON.stringify({ error: "blob-not-configured" }), {
      status: 501,
      headers: { "content-type": "application/json" },
    });
  }
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!/^[a-z0-9]{16,64}$/i.test(token)) {
    return new Response(null, { status: 404 });
  }

  const state = (await readLatestJson(STATE_DIR, STATE_LEGACY)) as {
    shares?: { token: string; projectId: string }[];
    projects?: Record<string, unknown>[];
    programs?: { id: string; name: string; divisionId: string }[];
    divisions?: { id: string; name: string }[];
  } | null;
  if (!state) return new Response(null, { status: 404 });

  const share = (state.shares ?? []).find((s) => s.token === token);
  if (!share) return new Response(null, { status: 404 });

  const project = (state.projects ?? []).find(
    (p) => (p as { id?: string }).id === share.projectId
  ) as
    | {
        id: string;
        name: string;
        description?: string;
        status: string;
        method?: string;
        programId: string;
        createdAt: number;
        hasVault?: boolean;
        nextSteps?: unknown[];
        notes?: string;
      }
    | undefined;
  if (!project) return new Response(null, { status: 404 });

  const program = (state.programs ?? []).find((p) => p.id === project.programId);
  const division = program
    ? (state.divisions ?? []).find((d) => d.id === program.divisionId)
    : undefined;

  const vault = project.hasVault
    ? await readLatestJson(vaultDir(project.id), vaultLegacy(project.id))
    : null;

  return Response.json(
    {
      project: {
        name: project.name,
        description: project.description,
        status: project.status,
        method: project.method,
        createdAt: project.createdAt,
      },
      program: program?.name,
      division: division?.name,
      vault,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
