// Shared workspace structure (divisions/programs/projects without vaults),
// stored as one JSON blob in Vercel Blob. Vault payloads live in /api/vault.

import { list, put } from "@vercel/blob";

export const dynamic = "force-dynamic";

const PATH = "state.json";
const EMPTY = { divisions: [], programs: [], projects: [] };

function notConfigured() {
  return new Response(JSON.stringify({ error: "blob-not-configured" }), {
    status: 501,
    headers: { "content-type": "application/json" },
  });
}

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return notConfigured();
  const { blobs } = await list({ prefix: PATH });
  const blob = blobs.find((b) => b.pathname === PATH);
  if (!blob) {
    return Response.json(EMPTY, { headers: { "cache-control": "no-store" } });
  }
  // cache-buster: blob CDN caches aggressively, query param busts it
  const res = await fetch(`${blob.url}?ts=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return Response.json(EMPTY, { headers: { "cache-control": "no-store" } });
  const body = await res.text();
  return new Response(body, {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function PUT(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return notConfigured();
  const body = await req.text();
  // minimal sanity check before overwriting the shared state
  const parsed = JSON.parse(body);
  if (
    !Array.isArray(parsed.divisions) ||
    !Array.isArray(parsed.programs) ||
    !Array.isArray(parsed.projects)
  ) {
    return new Response("invalid state", { status: 400 });
  }
  await put(PATH, body, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return new Response(null, { status: 204 });
}
