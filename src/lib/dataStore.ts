// Storage abstraction for the shared workspace.
//
// Two backends:
//   - GitHub branch (githubStore) — preferred when GITHUB_DATA_TOKEN +
//     GITHUB_DATA_REPO are set. Free, versioned, sha-based compare-and-swap.
//   - Vercel Blob (blobStore) — legacy fallback; can be suspended when the
//     account hits usage limits (surfaces as StorageSuspendedError → 503).
//
// The state document read returns an opaque `token` (the GitHub blob sha)
// that must be passed back to writeStateDoc so a concurrent write elsewhere
// fails with DataConflictError instead of silently clobbering it. The blob
// backend has no storage-level CAS (rev checking happens in the API route),
// so its token is undefined.

import {
  STATE_DIR,
  STATE_LEGACY,
  deleteVersioned,
  readLatestJson,
  vaultDir,
  vaultLegacy,
  writeVersionedJson,
} from "@/lib/blobStore";
import {
  DataConflictError,
  STATE_PATH,
  deleteJsonFile,
  githubConfigured,
  readJsonFile,
  vaultPath,
  writeJsonFile,
} from "@/lib/githubStore";

export { DataConflictError };
export { StorageSuspendedError } from "@/lib/blobStore";

export type StoreMode = "github" | "blob" | "none";

export function storeMode(): StoreMode {
  if (githubConfigured()) return "github";
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  return "none";
}

export interface StateDoc {
  data: Record<string, unknown> | null;
  /** opaque write token (GitHub blob sha); pass back to writeStateDoc */
  token?: string;
}

export async function readStateDoc(): Promise<StateDoc> {
  if (storeMode() === "github") {
    const file = await readJsonFile(STATE_PATH);
    return file ? { data: file.data, token: file.sha } : { data: null };
  }
  return { data: await readLatestJson(STATE_DIR, STATE_LEGACY) };
}

export async function writeStateDoc(data: unknown, token?: string): Promise<void> {
  if (storeMode() === "github") {
    await writeJsonFile(STATE_PATH, data, token);
    return;
  }
  await writeVersionedJson(STATE_DIR, data);
}

export async function readVault(
  projectId: string
): Promise<Record<string, unknown> | null> {
  if (storeMode() === "github") {
    const file = await readJsonFile(vaultPath(projectId));
    return file?.data ?? null;
  }
  return readLatestJson(vaultDir(projectId), vaultLegacy(projectId));
}

export async function writeVault(projectId: string, data: unknown): Promise<void> {
  if (storeMode() === "github") {
    // vaults are last-write-wins: retry once with a fresh sha on conflict
    for (let attempt = 0; attempt < 2; attempt++) {
      const current = await readJsonFile(vaultPath(projectId));
      try {
        await writeJsonFile(vaultPath(projectId), data, current?.sha);
        return;
      } catch (e) {
        if (!(e instanceof DataConflictError) || attempt === 1) throw e;
      }
    }
    return;
  }
  await writeVersionedJson(vaultDir(projectId), data);
}

export async function deleteVault(projectId: string): Promise<void> {
  if (storeMode() === "github") {
    await deleteJsonFile(vaultPath(projectId));
    return;
  }
  await deleteVersioned(vaultDir(projectId), vaultLegacy(projectId));
}
