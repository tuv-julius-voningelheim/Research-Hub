"use client";

// Research framing (goals, hypotheses, links) + extra report/share content
// blocks with placement. Everything here also surfaces in the report & share.

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { useHub } from "@/lib/store";
import type { Project, ReportPlacement } from "@/lib/types";
import { Card, SectionTitle, btnPrimary, btnSecondary, inputCls } from "@/components/ui";
import RichEditor from "@/components/RichEditor";

const PLACEMENTS: { value: ReportPlacement; label: string }[] = [
  { value: "top", label: "Ganz oben" },
  { value: "after-shortlist", label: "Nach Shortlist" },
  { value: "after-themes", label: "Nach Themes" },
  { value: "bottom", label: "Ganz unten" },
];

/** editable list of single-line strings */
function StringList({
  items,
  onChange,
  placeholder,
  accent,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  accent: string;
}) {
  const [draft, setDraft] = useState("");
  const { t } = useLang();
  return (
    <div>
      <ul className="mb-2 space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="group flex items-start gap-2">
            <span
              className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: accent }}
            />
            <input
              className={`${inputCls} py-1.5`}
              value={it}
              onChange={(e) =>
                onChange(items.map((x, idx) => (idx === i ? e.target.value : x)))
              }
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="shrink-0 cursor-pointer rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600"
              aria-label={t("Entfernen")}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          onChange([...items, draft.trim()]);
          setDraft("");
        }}
        className="flex gap-2"
      >
        <input
          className={inputCls}
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className={btnSecondary} disabled={!draft.trim()}>
          +
        </button>
      </form>
    </div>
  );
}

export default function ContextTab({ project }: { project: Project }) {
  const { t } = useLang();
  const {
    setGoals,
    setHypotheses,
    setLinks,
    addReportBlock,
    updateReportBlock,
    removeReportBlock,
  } = useHub();

  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const links = project.links ?? [];
  const blocks = project.reportBlocks ?? [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* goals + hypotheses */}
      <div className="space-y-6">
        <div>
          <SectionTitle sub={t("Was soll dieses Research beantworten? Erscheint oben im Report & Share.")}>
            Research Goals
          </SectionTitle>
          <Card className="p-4">
            <StringList
              items={project.goals ?? []}
              onChange={(g) => setGoals(project.id, g)}
              placeholder={t("Neues Research Goal…")}
              accent="#0057b8"
            />
          </Card>
        </div>
        <div>
          <SectionTitle sub={t("Annahmen, die das Research prüfen soll.")}>{t("Hypothesen")}</SectionTitle>
          <Card className="p-4">
            <StringList
              items={project.hypotheses ?? []}
              onChange={(h) => setHypotheses(project.id, h)}
              placeholder={t("Neue Hypothese…")}
              accent="#d97706"
            />
          </Card>
        </div>
        <div>
          <SectionTitle sub={t("Relevante Dokumente, Prototypen, Miro-Boards …")}>
            {t("Relevante Links")}
          </SectionTitle>
          <Card className="p-4">
            <ul className="mb-2 space-y-1.5">
              {links.map((l) => (
                <li key={l.id} className="flex items-center gap-2">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate rounded-lg bg-neutral-50 px-3 py-1.5 text-sm font-semibold text-[#0057b8] ring-1 ring-neutral-200 hover:underline"
                  >
                    {l.label || l.url}
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      setLinks(project.id, links.filter((x) => x.id !== l.id))
                    }
                    className="shrink-0 cursor-pointer rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={t("Link entfernen")}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!linkUrl.trim()) return;
                setLinks(project.id, [
                  ...links,
                  {
                    id: Math.random().toString(36).slice(2, 10),
                    label: linkLabel.trim(),
                    url: linkUrl.trim(),
                  },
                ]);
                setLinkLabel("");
                setLinkUrl("");
              }}
              className="space-y-2"
            >
              <input
                className={inputCls}
                placeholder={t("Bezeichnung (z. B. Prototyp)")}
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder="https://…"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
                <button type="submit" className={btnSecondary} disabled={!linkUrl.trim()}>
                  +
                </button>
              </div>
            </form>
          </Card>
        </div>
      </div>

      {/* report blocks */}
      <div>
        <div className="mb-3 flex items-end justify-between gap-3">
          <SectionTitle sub={t("Freie Inhalte für Report & Share — mit Position und Rich-Text (Überschriften, Fett, Kursiv, Listen …).")}>
            {t("Zusätzliche Report-Inhalte")}
          </SectionTitle>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => addReportBlock(project.id, "top")}
          >
            + Block
          </button>
        </div>
        <div className="space-y-3">
          {blocks.length === 0 && (
            <Card className="p-6 text-center text-sm text-neutral-400">
              {t("Noch keine zusätzlichen Inhalte.")}
            </Card>
          )}
          {blocks.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <input
                  className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-900 outline-none focus:border-[#0057b8] focus:ring-4 focus:ring-blue-600/10"
                  placeholder={t("Überschrift")}
                  value={b.title}
                  onChange={(e) =>
                    updateReportBlock(project.id, b.id, { title: e.target.value })
                  }
                />
                <select
                  className="w-40 shrink-0 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 outline-none focus:border-[#0057b8]"
                  value={b.placement}
                  onChange={(e) =>
                    updateReportBlock(project.id, b.id, {
                      placement: e.target.value as ReportPlacement,
                    })
                  }
                >
                  {PLACEMENTS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {t(p.label)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeReportBlock(project.id, b.id)}
                  className="shrink-0 cursor-pointer rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={t("Block entfernen")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                </button>
              </div>
              <RichEditor
                html={b.body}
                onChange={(v) => updateReportBlock(project.id, b.id, { body: v })}
                placeholder={t("Inhalt… (Überschriften, Fett, Kursiv, Listen über die Leiste oben)")}
              />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
