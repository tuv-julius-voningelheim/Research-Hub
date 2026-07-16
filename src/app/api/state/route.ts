// Shared workspace structure (divisions/programs/projects without vaults).
// Stored as versioned JSON blobs (see blobStore.ts — avoids CDN staleness).
//
// Concurrency: the document carries a monotonically increasing `rev`.
// PUT must send the `baseRev` it was based on; a mismatch returns 409 so the
// client can surface "workspace changed elsewhere" instead of silently
// overwriting someone else's edits (optimistic concurrency, small-team scale).

import {
  STATE_DIR,
  STATE_LEGACY,
  StorageSuspendedError,
  readLatestJson,
  writeVersionedJson,
} from "@/lib/blobStore";

export const dynamic = "force-dynamic";

const EMPTY = { rev: 0, divisions: [], programs: [], projects: [], shares: [] };

function notConfigured() {
  return new Response(JSON.stringify({ error: "blob-not-configured" }), {
    status: 501,
    headers: { "content-type": "application/json" },
  });
}

async function readCurrent() {
  const data = await readLatestJson(STATE_DIR, STATE_LEGACY);
  if (!data) return EMPTY;
  return {
    ...EMPTY,
    ...data,
    rev: typeof data.rev === "number" ? data.rev : 0,
  };
}

function suspended() {
  return new Response(JSON.stringify({ error: "storage-suspended" }), {
    status: 503,
    headers: { "content-type": "application/json" },
  });
}

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return notConfigured();
  try {
    const current = await readCurrent();
    return Response.json(current, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    if (e instanceof StorageSuspendedError) return suspended();
    throw e;
  }
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

  let current;
  try {
    current = await readCurrent();
  } catch (e) {
    if (e instanceof StorageSuspendedError) return suspended();
    throw e;
  }
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
    shares: Array.isArray(body.shares) ? body.shares : [],
  };
  await writeVersionedJson(STATE_DIR, next);
  return Response.json(
    { ok: true, rev: next.rev },
    { headers: { "cache-control": "no-store" } }
  );
}
