"use client";

// Shown when a project that already has data receives a new upload.
// Behaves like a merge review: manual notes are always kept, clean edits
// are kept silently, and conflicts (edited AND changed upstream) are
// resolved per note — keep mine vs. take the new version.

import { useState } from "react";
import { diffSummary, TYPE_TITLE, type DiffEntry } from "@/lib/editable";
import type { EditableContent, Vault } from "@/lib/types";
import { Modal, btnPrimary, btnSecondary } from "@/components/ui";

function contentLines(c: EditableContent): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const [k, v] of Object.entries(c.meta)) if (v) out.push({ label: k, value: v });
  for (const [k, v] of Object.entries(c.fields))
    if (v.trim()) out.push({ label: k, value: v.trim() });
  return out;
}

function DiffColumn({
  variant,
  content,
  selected,
  onSelect,
}: {
  variant: "mine" | "theirs";
  content: EditableContent;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex-1 cursor-pointer rounded-xl border-2 p-3 text-left transition-colors ${
        selected
          ? variant === "mine"
            ? "border-[#0057b8] bg-blue-50/50"
            : "border-emerald-500 bg-emerald-50/50"
          : "border-neutral-200 bg-white hover:border-neutral-300"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`text-xs font-bold ${
            variant === "mine" ? "text-[#0057b8]" : "text-emerald-700"
          }`}
        >
          {variant === "mine" ? "Deine Version behalten" : "Neue Version übernehmen"}
        </span>
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
            selected
              ? variant === "mine"
                ? "border-[#0057b8] bg-[#0057b8]"
                : "border-emerald-500 bg-emerald-500"
              : "border-neutral-300"
          }`}
        >
          {selected && (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </span>
      </div>
      <div className="text-sm font-bold text-neutral-900">{content.title}</div>
      <div className="mt-1.5 space-y-1">
        {contentLines(content).slice(0, 4).map((l, i) => (
          <div key={i} className="text-xs leading-snug text-neutral-600">
            <span className="font-semibold text-neutral-500">{l.label}:</span>{" "}
            {l.value.length > 140 ? l.value.slice(0, 140) + "…" : l.value}
          </div>
        ))}
      </div>
    </button>
  );
}

const INFO_META: Record<
  string,
  { label: string; cls: string }
> = {
  new: { label: "Neu im Upload", cls: "text-emerald-700" },
  "edited-clean": { label: "Deine Bearbeitung bleibt", cls: "text-blue-700" },
  "manual-kept": { label: "Manuell — bleibt erhalten", cls: "text-violet-700" },
  "removed-upstream": {
    label: "Upstream entfernt — als manuell behalten",
    cls: "text-amber-700",
  },
};

export default function UploadDiffModal({
  entries,
  vault,
  onApply,
  onClose,
}: {
  entries: DiffEntry[];
  vault: Vault;
  onApply: (resolutions: Record<string, "mine" | "theirs">) => void;
  onClose: () => void;
}) {
  const conflicts = entries.filter((e) => e.status === "conflict");
  const infos = entries.filter((e) =>
    ["new", "edited-clean", "manual-kept", "removed-upstream"].includes(e.status)
  );
  const summary = diffSummary(entries);

  const [res, setRes] = useState<Record<string, "mine" | "theirs">>(() =>
    Object.fromEntries(conflicts.map((c) => [c.slug, "mine" as const]))
  );

  return (
    <Modal title="Änderungen übernehmen" onClose={onClose} wide>
      <p className="mb-3 text-sm leading-relaxed text-neutral-600">
        Der neue Export wurde mit dem aktuellen Stand abgeglichen. Manuell
        angelegte Elemente bleiben immer erhalten, deine Bearbeitungen werden
        beibehalten — nur bei Konflikten entscheidest du.
      </p>

      {/* summary */}
      <div className="mb-4 flex flex-wrap gap-2">
        {summary.conflicts > 0 && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
            {summary.conflicts} Konflikte
          </span>
        )}
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
          {summary.added} neu
        </span>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800 ring-1 ring-blue-200">
          {summary.edited} Bearbeitungen behalten
        </span>
        {summary.manual > 0 && (
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-800 ring-1 ring-violet-200">
            {summary.manual} manuell
          </span>
        )}
        {summary.removed > 0 && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
            {summary.removed} upstream entfernt
          </span>
        )}
      </div>

      <div className="max-h-[52vh] space-y-4 overflow-y-auto pr-1">
        {conflicts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-neutral-900">
              Konflikte ({conflicts.length})
            </h3>
            {conflicts.map((c) => (
              <div key={c.slug} className="rounded-xl bg-neutral-50 p-3 ring-1 ring-neutral-200">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {TYPE_TITLE[c.type]}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <DiffColumn
                    variant="mine"
                    content={c.mine!}
                    selected={res[c.slug] === "mine"}
                    onSelect={() => setRes((r) => ({ ...r, [c.slug]: "mine" }))}
                  />
                  <DiffColumn
                    variant="theirs"
                    content={c.theirs!}
                    selected={res[c.slug] === "theirs"}
                    onSelect={() => setRes((r) => ({ ...r, [c.slug]: "theirs" }))}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {infos.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-bold text-neutral-900">Übersicht</h3>
            <div className="divide-y divide-neutral-100 rounded-xl ring-1 ring-neutral-200">
              {infos.map((e) => {
                const meta = INFO_META[e.status];
                return (
                  <div key={e.slug} className="flex items-center gap-3 px-3 py-2">
                    <span className={`w-56 shrink-0 text-xs font-semibold ${meta.cls}`}>
                      {meta.label}
                    </span>
                    <span className="truncate text-sm text-neutral-700">
                      {TYPE_TITLE[e.type]}: {e.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-neutral-100 pt-4">
        <button type="button" className={btnSecondary} onClick={onClose}>
          Abbrechen
        </button>
        <button type="button" className={btnPrimary} onClick={() => onApply(res)}>
          Upload übernehmen
        </button>
      </div>
    </Modal>
  );
}
