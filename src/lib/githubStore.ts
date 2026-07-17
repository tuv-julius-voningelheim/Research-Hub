// Server-side storage on a dedicated GitHub branch (Contents API).
//
// Files live on an orphan branch (default `workspace-data`):
//   data/state.json            — workspace structure
//   data/vaults/<id>.json      — parsed vault per project
//
// Reads use `Accept: application/vnd.github.raw` (works up to 100 MB, always
// fresh — the API is not CDN-cached). Writes go through the Contents PUT
// endpoint, which requires the current blob sha of the file: GitHub rejects
// the write if the file changed in between, giving us compare-and-swap for
// free. The blob sha is computed locally from the raw content
// (sha1("blob <len>\0<content>")), so a read costs exactly one request.
//
// Every write is a commit — the full history of the workspace is kept in git,
// which doubles as a backup/undo trail.

import { createHash } from "node:crypto";

export class DataConflictError extends Error {
  constructor() {
    super("github contents sha mismatch");
    this.name = "DataConflictError";
  }
}

const apiBase = () =>
  (process.env.GITHUB_DATA_API_BASE ?? "https://api.github.com").replace(/\/$/, "");
const repo = () => process.env.GITHUB_DATA_REPO ?? "";
const branch = () => process.env.GITHUB_DATA_BRANCH ?? "workspace-data";
const token = () => process.env.GITHUB_DATA_TOKEN ?? "";

export const githubConfigured = () => Boolean(token() && repo());

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    Authorization: `Bearer ${token()}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "research-hub",
    ...extra,
  };
}

function contentsUrl(path: string): string {
  return `${apiBase()}/repos/${repo()}/contents/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function blobSha(text: string): string {
  const body = Buffer.from(text, "utf8");
  return createHash("sha1")
    .update(`blob ${body.byteLength}\0`)
    .update(body)
    .digest("hex");
}

/** Read a JSON file; returns the parsed data plus the blob sha needed to update it. */
export async function readJsonFile(
  path: string
): Promise<{ data: Record<string, unknown>; sha: string } | null> {
  const res = await fetch(`${contentsUrl(path)}?ref=${encodeURIComponent(branch())}`, {
    headers: headers({ Accept: "application/vnd.github.raw" }),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`github read ${path} failed: ${res.status} ${await res.text()}`);
  }
  const text = await res.text();
  return { data: JSON.parse(text), sha: blobSha(text) };
}

/**
 * Create or update a JSON file. Pass the sha from the read the write is based
 * on; omit it only when the file is known not to exist. A sha mismatch (file
 * changed elsewhere) throws DataConflictError.
 */
export async function writeJsonFile(
  path: string,
  data: unknown,
  sha?: string
): Promise<void> {
  const res = await fetch(contentsUrl(path), {
    method: "PUT",
    headers: headers({
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    }),
    cache: "no-store",
    body: JSON.stringify({
      message: `Update ${path}`,
      content: Buffer.from(JSON.stringify(data), "utf8").toString("base64"),
      branch: branch(),
      ...(sha ? { sha } : {}),
    }),
  });
  if (res.status === 409 || res.status === 422) throw new DataConflictError();
  if (!res.ok) {
    throw new Error(`github write ${path} failed: ${res.status} ${await res.text()}`);
  }
}

/** Delete a file if it exists (reads the current sha first). */
export async function deleteJsonFile(path: string): Promise<void> {
  const current = await readJsonFile(path);
  if (!current) return;
  const res = await fetch(contentsUrl(path), {
    method: "DELETE",
    headers: headers({
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    }),
    cache: "no-store",
    body: JSON.stringify({
      message: `Delete ${path}`,
      sha: current.sha,
      branch: branch(),
    }),
  });
  if (res.status === 404 || res.status === 409 || res.status === 422) return;
  if (!res.ok) {
    throw new Error(`github delete ${path} failed: ${res.status} ${await res.text()}`);
  }
}

export const STATE_PATH = "data/state.json";
export const vaultPath = (projectId: string) => `data/vaults/${projectId}.json`;
