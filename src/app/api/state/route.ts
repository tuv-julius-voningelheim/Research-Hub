// Shared workspace structure (divisions/programs/projects without vaults).
// Stored via the dataStore abstraction — a GitHub data branch when
// configured, Vercel Blob otherwise (see dataStore.ts).
//
// Concurrency: the document carries a monotonically increasing `rev`.
// PUT must send the `baseRev` it was based on; a mismatch returns 409 so the
// client can surface "workspace changed elsewhere" instead of silently
// overwriting someone else's edits (optimistic concurrency, small-team scale).
// The GitHub backend additionally rejects writes whose underlying file
// changed between our read and write (sha CAS), closing the race window.

import {
  DataConflictError,
  StorageSuspendedError,
  readStateDoc,
  storeMode,
  writeStateDoc,
} from "@/lib/dataStore";

export const dynamic = "force-dynamic";

const EMPTY = { rev: 0, divisions: [], programs: [], projects: [], shares: [] };

function notConfigured() {
  return new Response(JSON.stringify({ error: "storage-not-configured" }), {
    status: 501,
    headers: { "content-type": "application/json" },
  });
}

function suspended() {
  return new Response(JSON.stringify({ error: "storage-suspended" }), {
    status: 503,
    headers: { "content-type": "application/json" },
  });
}

async function readCurrent() {
  const { data, token } = await readStateDoc();
  if (!data) return { current: EMPTY, token };
  return {
    current: {
      ...EMPTY,
      ...data,
      rev: typeof data.rev === "number" ? data.rev : 0,
    },
    token,
  };
}

export async function GET() {
  if (storeMode() === "none") return notConfigured();
  try {
    const { current } = await readCurrent();
    return Response.json(current, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    if (e instanceof StorageSuspendedError) return suspended();
    throw e;
  }
}

export async function PUT(req: Request) {
  if (storeMode() === "none") return notConfigured();
  const body = await req.json();
  if (
    !Array.isArray(body.divisions) ||
    !Array.isArray(body.programs) ||
    !Array.isArray(body.projects) ||
    typeof body.baseRev !== "number"
  ) {
    return new Response("invalid state", { status: 400 });
  }

  let current, token;
  try {
    ({ current, token } = await readCurrent());
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
  try {
    await writeStateDoc(next, token);
  } catch (e) {
    if (e instanceof DataConflictError) {
      // someone else wrote between our read and write
      const { current: latest } = await readCurrent();
      return Response.json(
        { error: "conflict", rev: latest.rev },
        { status: 409, headers: { "cache-control": "no-store" } }
      );
    }
    if (e instanceof StorageSuspendedError) return suspended();
    throw e;
  }
  return Response.json(
    { ok: true, rev: next.rev },
    { headers: { "cache-control": "no-store" } }
  );
}
