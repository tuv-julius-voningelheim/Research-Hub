"use client";

// Requirements checklist — a working file for the PDM team (colleague
// feedback). Seedable from the project's recommendations and needs,
// then maintained by hand like a checklist.

import { useMemo, useState } from "react";
import { notesOf, recTraces } from "@/lib/analytics";
import { useLang } from "@/lib/i18n";
import { useHub } from "@/lib/store";
import type { Project } from "@/lib/types";
import { Card, SectionTitle, btnPrimary, btnSecondary, inputCls } from "@/components/ui";

export default function RequirementsTab({ project }: { project: Project }) {
  const { addRequirement, toggleRequirement, removeRequirement, seedRequirements } =
    useHub();
  const { t } = useLang();
  const [draft, setDraft] = useState("");

  const seedTexts = useMemo(() => {
    const vault = project.vault;
    const recs = recTraces(vault).map((r) => `[Rec] ${r.note.title}`);
    const needs = notesOf(vault, "need").map((n) => `[Need] ${n.title}`);
    return [...recs, ...needs];
  }, [project.vault]);

  const items = project.requirements ?? [];
  const open = items.filter((s) => !s.done);
  const done = items.filter((s) => s.done);

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle sub={t("Working File für das PDM-Team: Anforderungen aus der Research ableiten, priorisieren und abhaken. Einträge lassen sich aus Recommendations & Needs vorbefüllen.")}>
          MACE Requirements Checklist
        </SectionTitle>
        {seedTexts.length > 0 && (
          <button
            type="button"
            className={btnSecondary}
            onClick={() => seedRequirements(project.id, seedTexts)}
          >
            {t("Aus Recommendations & Needs befüllen")}
          </button>
        )}
      </div>

      <Card className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            addRequirement(project.id, draft.trim());
            setDraft("");
          }}
          className="mb-3 flex gap-2"
        >
          <input
            className={inputCls}
            placeholder={t("Neue Anforderung hinzufügen…")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className={btnPrimary} disabled={!draft.trim()}>
            Add
          </button>
        </form>

        {items.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-400">
            {t("Noch keine Anforderungen — manuell hinzufügen oder aus Recommendations & Needs befüllen.")}
          </p>
        )}

        <ul className="space-y-1">
          {[...open, ...done].map((s) => (
            <li
              key={s.id}
              className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-neutral-50"
            >
              <button
                type="button"
                onClick={() => toggleRequirement(project.id, s.id)}
                aria-label={s.done ? t("Als offen markieren") : t("Als erledigt markieren")}
                className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors ${
                  s.done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-neutral-300 bg-white hover:border-[#0057b8]"
                }`}
              >
                {s.done && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
              <span
                className={`flex-1 text-sm ${
                  s.done ? "text-neutral-400 line-through" : "text-neutral-800"
                }`}
              >
                {s.text.startsWith("[Rec]") || s.text.startsWith("[Need]") ? (
                  <>
                    <span
                      className={`mr-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        s.text.startsWith("[Rec]")
                          ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                          : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                      }`}
                    >
                      {s.text.startsWith("[Rec]") ? "Rec" : "Need"}
                    </span>
                    {s.text.replace(/^\[(Rec|Need)\]\s*/, "")}
                  </>
                ) : (
                  s.text
                )}
              </span>
              <button
                type="button"
                onClick={() => removeRequirement(project.id, s.id)}
                aria-label={t("Löschen")}
                className="cursor-pointer rounded p-1 text-neutral-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
