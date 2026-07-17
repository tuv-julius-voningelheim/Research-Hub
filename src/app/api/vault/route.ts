// Parsed vault payload per project. Stored via the dataStore abstraction —
// a GitHub data branch when configured, Vercel Blob otherwise.

import {
  StorageSuspendedError,
  deleteVault,
  readVault,
  storeMode,
  writeVault,
} from "@/lib/dataStore";

export const dynamic = "force-dynamic";

function projectIdFrom(req: Request): string | null {
  const id = new URL(req.url).searchParams.get("projectId");
  return id && /^[a-z0-9]+$/i.test(id) ? id : null;
}

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

export async function GET(req: Request) {
  if (storeMode() === "none") return notConfigured();
  const id = projectIdFrom(req);
  if (!id) return new Response("projectId required", { status: 400 });
  let data;
  try {
    data = await readVault(id);
  } catch (e) {
    if (e instanceof StorageSuspendedError) return suspended();
    throw e;
  }
  if (!data) return new Response(null, { status: 404 });
  return Response.json(data, {
    headers: { "cache-control": "no-store" },
  });
}

export async function PUT(req: Request) {
  if (storeMode() === "none") return notConfigured();
  const id = projectIdFrom(req);
  if (!id) return new Response("projectId required", { status: 400 });
  const parsed = await req.json();
  if (!Array.isArray(parsed.notes)) {
    return new Response("invalid vault", { status: 400 });
  }
  try {
    await writeVault(id, parsed);
  } catch (e) {
    if (e instanceof StorageSuspendedError) return suspended();
    throw e;
  }
  return new Response(null, { status: 204 });
}

export async function DELETE(req: Request) {
  if (storeMode() === "none") return notConfigured();
  const id = projectIdFrom(req);
  if (!id) return new Response("projectId required", { status: 400 });
  try {
    await deleteVault(id);
  } catch (e) {
    if (e instanceof StorageSuspendedError) return suspended();
    throw e;
  }
  return new Response(null, { status: 204 });
}
