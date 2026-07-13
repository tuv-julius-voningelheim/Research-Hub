// Shared workspace structure (divisions/programs/projects without vaults),
// stored as one JSON blob in Vercel Blob. Vault payloads live in /api/vault.
//
// Concurrency: the stored document carries a monotonically increasing `rev`.
// PUT must send the `baseRev` it was based on; a mismatch returns 409 so the
// client can surface "workspace changed elsewhere" instead of silently
// overwriting someone else's edits (optimistic concurrency, small-team scale).

import { list, put } from "@vercel/blob";

export const dynamic = "force-dynamic";

const PATH = "state.json";
const EMPTY = { rev: 0, divisions: [], programs: [], projects: [] };

function notConfigured() {
  return new Response(JSON.stringify({ error: "blob-not-configured" }), {
    status: 501,
    headers: { "content-type": "application/json" },
  });
}

async function readCurrent(): Promise<{
  rev: number;
  divisions: unknown[];
  programs: unknown[];
  projects: unknown[];
}> {
  const { blobs } = await list({ prefix: PATH });
  const blob = blobs.find((b) => b.pathname === PATH);
  if (!blob) return EMPTY;
  // cache-buster: blob CDN caches aggressively, query param busts it
  const res = await fetch(`${blob.url}?ts=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return EMPTY;
  const data = await res.json();
  return { ...EMPTY, ...data, rev: typeof data.rev === "number" ? data.rev : 0 };
}

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return notConfigured();
  const current = await readCurrent();
  return Response.json(current, { headers: { "cache-control": "no-store" } });
}

export async function PUT(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return notConfigured();
  const body = await req.json();
  if (
    !Array.isArray(body.divisions) ||
    !Array.isArray(body.programs) ||
    !Array.isArray(body.projects) ||
    typeof body.baseRev !== "number"
  ) {
    return new Response("invalid state", { status: 400 });
  }

  const current = await readCurrent();
  if (body.baseRev !== current.rev) {
    return Response.json(
      { error: "conflict", rev: current.rev },
      { status: 409, headers: { "cache-control": "no-store" } }
    );
  }

  const next = {
    rev: current.rev + 1,
    divisions: body.divisions,
    programs: body.programs,
    projects: body.projects,
  };
  await put(PATH, JSON.stringify(next), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return Response.json(
    { ok: true, rev: next.rev },
    { headers: { "cache-control": "no-store" } }
  );
}
