"use client";

// Team notes + next-steps checklist, stored on the project (synced workspace).

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { useHub } from "@/lib/store";
import type { Project } from "@/lib/types";
import { Card, SectionTitle, btnPrimary, inputCls } from "@/components/ui";

export default function NotesTab({ project }: { project: Project }) {
  const { addNextStep, toggleNextStep, removeNextStep, setNotes } = useHub();
  const { t } = useLang();
  const [draft, setDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState(project.notes ?? "");
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // keep local draft in sync when the workspace refreshes externally
  useEffect(() => {
    setNotesDraft(project.notes ?? "");
  }, [project.notes]);

  function onNotesChange(v: string) {
    setNotesDraft(v);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setNotes(project.id, v);
      setSaved(true);
    }, 800);
  }

  const steps = project.nextSteps ?? [];
  const open = steps.filter((s) => !s.done);
  const done = steps.filter((s) => s.done);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* next steps */}
      <div>
        <SectionTitle sub={t("Aufgaben, die aus der Auswertung folgen — für das ganze Team sichtbar.")}>
          Next Steps
        </SectionTitle>
        <Card className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              addNextStep(project.id, draft.trim());
              setDraft("");
            }}
            className="mb-3 flex gap-2"
          >
            <input
              className={inputCls}
              placeholder={t("Neuen Next Step hinzufügen…")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className={btnPrimary} disabled={!draft.trim()}>
              Add
            </button>
          </form>

          {steps.length === 0 && (
            <p className="py-6 text-center text-sm text-neutral-400">
              {t("Noch keine Next Steps.")}
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
                  onClick={() => toggleNextStep(project.id, s.id)}
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
                  {s.text}
                </span>
                <button
                  type="button"
                  onClick={() => removeNextStep(project.id, s.id)}
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

      {/* notes */}
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <SectionTitle sub={t("Freitext — speichert automatisch.")}>{t("Notizen")}</SectionTitle>
          <span className={`text-xs ${saved ? "text-neutral-400" : "text-amber-600"}`}>
            {saved ? t("Gespeichert") : t("Speichert…")}
          </span>
        </div>
        <Card className="p-2">
          <textarea
            className="min-h-[320px] w-full resize-y rounded-lg border-0 bg-transparent px-3 py-2 text-sm leading-relaxed text-neutral-800 outline-none placeholder:text-neutral-400"
            placeholder={t("Beobachtungen, Entscheidungen, Kontext für das Team…")}
            value={notesDraft}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        </Card>
      </div>
    </div>
  );
}
