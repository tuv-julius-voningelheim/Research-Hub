// Server-side helpers around Vercel Blob.
//
// Overwritten blobs are CDN-cached for up to ~60s, so "write same pathname"
// serves stale reads. Instead every write creates a NEW versioned pathname
// (timestamp prefix); readers pick the newest, writers prune old versions.
// Legacy single-file paths (state.json, vaults/<id>.json) are read as
// fallback so existing workspaces migrate transparently.

import { del, list, put } from "@vercel/blob";

function newest(paths: { pathname: string; url: string; uploadedAt: Date | string }[]) {
  // timestamp-prefixed filenames sort lexicographically; uploadedAt as tiebreaker
  return [...paths].sort((a, b) =>
    b.pathname.localeCompare(a.pathname) ||
    +new Date(b.uploadedAt) - +new Date(a.uploadedAt)
  )[0];
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${url}?ts=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function readLatestJson(
  dir: string,
  legacyPath?: string
): Promise<Record<string, unknown> | null> {
  const { blobs } = await list({ prefix: `${dir}/` });
  if (blobs.length > 0) {
    const data = await fetchJson(newest(blobs).url);
    if (data) return data;
  }
  if (legacyPath) {
    const { blobs: legacy } = await list({ prefix: legacyPath });
    const hit = legacy.find((b) => b.pathname === legacyPath);
    if (hit) return fetchJson(hit.url);
  }
  return null;
}

export async function writeVersionedJson(dir: string, data: unknown): Promise<void> {
  const pathname = `${dir}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  await put(pathname, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
  // prune: keep the 3 newest versions
  const { blobs } = await list({ prefix: `${dir}/` });
  const sorted = [...blobs].sort((a, b) => b.pathname.localeCompare(a.pathname));
  await Promise.all(sorted.slice(3).map((b) => del(b.url).catch(() => {})));
}

export async function deleteVersioned(dir: string, legacyPath?: string): Promise<void> {
  const { blobs } = await list({ prefix: `${dir}/` });
  await Promise.all(blobs.map((b) => del(b.url).catch(() => {})));
  if (legacyPath) {
    const { blobs: legacy } = await list({ prefix: legacyPath });
    await Promise.all(
      legacy
        .filter((b) => b.pathname === legacyPath)
        .map((b) => del(b.url).catch(() => {}))
    );
  }
}

export const STATE_DIR = "state-v";
export const STATE_LEGACY = "state.json";
export const vaultDir = (projectId: string) => `vault-v/${projectId}`;
export const vaultLegacy = (projectId: string) => `vaults/${projectId}.json`;
