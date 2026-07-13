// Parsed vault payload per project, one JSON blob each:  vaults/<projectId>.json

import { del, list, put } from "@vercel/blob";

export const dynamic = "force-dynamic";

function pathFor(projectId: string) {
  return `vaults/${projectId}.json`;
}

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
  const path = pathFor(id);
  const { blobs } = await list({ prefix: path });
  const blob = blobs.find((b) => b.pathname === path);
  if (!blob) return new Response(null, { status: 404 });
  const res = await fetch(`${blob.url}?ts=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return new Response(null, { status: 404 });
  return new Response(res.body, {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function PUT(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return notConfigured();
  const id = projectIdFrom(req);
  if (!id) return new Response("projectId required", { status: 400 });
  const body = await req.text();
  const parsed = JSON.parse(body);
  if (!Array.isArray(parsed.notes)) {
    return new Response("invalid vault", { status: 400 });
  }
  await put(pathFor(id), body, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return new Response(null, { status: 204 });
}

export async function DELETE(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return notConfigured();
  const id = projectIdFrom(req);
  if (!id) return new Response("projectId required", { status: 400 });
  const path = pathFor(id);
  const { blobs } = await list({ prefix: path });
  const blob = blobs.find((b) => b.pathname === path);
  if (blob) await del(blob.url);
  return new Response(null, { status: 204 });
}
