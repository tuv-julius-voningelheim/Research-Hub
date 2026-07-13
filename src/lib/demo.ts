// Seeds the hub with the bundled example export (public/demo/…zip)
// using the exact same parsing pipeline as a user upload.

import { parseVaultZip } from "./parser";
import type { Vault } from "./types";

export const DEMO_ZIP_URL = "/demo/Second_Brain_Test_1.zip";
export const DEMO_ZIP_NAME = "Second_Brain_Test_1.zip";

export async function loadDemoVault(): Promise<Vault> {
  const res = await fetch(DEMO_ZIP_URL);
  if (!res.ok) throw new Error("Demo-ZIP konnte nicht geladen werden.");
  const blob = await res.blob();
  return parseVaultZip(blob, DEMO_ZIP_NAME);
}
