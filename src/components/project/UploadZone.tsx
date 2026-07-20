"use client";

import { useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { parseVaultZip } from "@/lib/parser";
import type { Vault } from "@/lib/types";
import { UploadIcon } from "@/components/icons";

export default function UploadZone({
  compact,
  onParsed,
}: {
  compact?: boolean;
  onParsed: (vault: Vault) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (!/\.zip$/i.test(file.name)) {
      setError(t("Bitte eine ZIP-Datei hochladen (Second-Brain-Export)."));
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const vault = await parseVaultZip(file, file.name);
      onParsed(vault);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const zone = (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) void handleFile(f);
      }}
      className={`cursor-pointer rounded-xl border-2 border-dashed transition-colors ${
        dragOver
          ? "border-[#0a5cd5] bg-blue-50"
          : "border-neutral-300 bg-white hover:border-[#0a5cd5] hover:bg-blue-50/40"
      } ${compact ? "px-4 py-3" : "px-6 py-12"}`}
    >
      <div
        className={`flex items-center justify-center gap-3 text-neutral-600 ${
          compact ? "" : "flex-col"
        }`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#004a99]">
          {UploadIcon}
        </div>
        <div className={compact ? "" : "text-center"}>
          <div className="text-sm font-bold text-neutral-800">
            {busy ? t("Wird ausgewertet…") : t("Second-Brain-Export (ZIP) hochladen")}
          </div>
          {!compact && (
            <div className="mt-1 text-xs text-neutral-500">
              {t("Drag & drop oder klicken. Der Obsidian-Vault wird direkt im Browser geparst — Interviews, Themes, Pain Points, Needs, Insights, Recommendations, Personas.")}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      {zone}
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
    </div>
  );
}
