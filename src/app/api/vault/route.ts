// Parsed vault payload per project, stored as versioned JSON blobs
// (see blobStore.ts — avoids CDN staleness on overwrite).

import {
  deleteVersioned,
  readLatestJson,
  vaultDir,
  vaultLegacy,
  writeVersionedJson,
} from "@/lib/blobStore";

export const dynamic = "force-dynamic";

function projectIdFrom(req: Request): string | null {
  const id = new URL(req.url).searchParams.get("projectId");
  return id && /^[a-z0-9]+$/i.test(id) ? id : null;
}

function notConfigured() {
  return new Response(JSON.stringify({ error: "blob-not-configured" }), {
    status: 501,
    headers: { "content-type": "application/json" },
  });
}

export async function GET(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return notConfigured();
  const id = projectIdFrom(req);
  if (!id) return new Response("projectId required", { status: 400 });
  const data = await readLatestJson(vaultDir(id), vaultLegacy(id));
  if (!data) return new Response(null, { status: 404 });
  return Response.json(data, {
    headers: { "cache-control": "no-store" },
  });
}

export async function PUT(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return notConfigured();
  const id = projectIdFrom(req);
  if (!id) return new Response("projectId required", { status: 400 });
  const parsed = await req.json();
  if (!Array.isArray(parsed.notes)) {
    return new Response("invalid vault", { status: 400 });
  }
  await writeVersionedJson(vaultDir(id), parsed);
  return new Response(null, { status: 204 });
}

export async function DELETE(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return notConfigured();
  const id = projectIdFrom(req);
  if (!id) return new Response("projectId required", { status: 400 });
  await deleteVersioned(vaultDir(id), vaultLegacy(id));
  return new Response(null, { status: 204 });
}
