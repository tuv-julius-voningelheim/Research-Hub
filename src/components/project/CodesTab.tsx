"use client";

// Codes explorer: every #code/… tag across the vault with frequency chart,
// searchable list and expandable meaning units / references.

import { useMemo, useState } from "react";
import { codesIndex } from "@/lib/analytics";
import type { Note, Vault } from "@/lib/types";
import { Card, SectionTitle, inputCls } from "@/components/ui";
import { TYPE_LABEL } from "./NoteDrawer";

export default function CodesTab({
  vault,
  onOpen,
}: {
  vault: Vault;
  onOpen: (n: Note) => void;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const all = useMemo(() => codesIndex(vault), [vault]);

  const visible = useMemo(
    () =>
      all.filter((e) =>
        e.code.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [all, query]
  );

  const top = all.slice(0, 12);
  const max = Math.max(1, ...top.map((e) => e.total));

  return (
    <div className="space-y-6">
      {/* frequency chart — sequential single hue (magnitude) */}
      {top.length > 0 && (
        <Card className="p-5">
          <SectionTitle sub="Meaning Units + Referenzen in Themes/Pain Points/Insights">
            Häufigste Codes
          </SectionTitle>
          <div className="space-y-2">
            {top.map((e) => (
              <button
                key={e.code}
                type="button"
                onClick={() => setExpanded(expanded === e.code ? null : e.code)}
                className="flex w-full cursor-pointer items-center gap-3 text-left"
              >
                <div className="w-64 shrink-0 truncate text-xs font-semibold text-neutral-700">
                  {e.code.replace("#code/", "")}
                </div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-[#2a78d6]"
                    style={{ width: `${(e.total / max) * 100}%` }}
                  />
                </div>
                <div className="w-6 text-right text-sm font-bold text-neutral-800">
                  {e.total}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <input
        className={`${inputCls} max-w-md`}
        placeholder={`Codes filtern… (${all.length} gesamt)`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="space-y-2">
        {visible.map((e) => (
          <Card key={e.code} className="overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(expanded === e.code ? null : e.code)}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-blue-50/40"
            >
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {e.code.replace("#code/", "")}
              </span>
              <span className="flex-1" />
              <span className="text-xs text-neutral-500">
                {e.quotes.length} Meaning Units · {e.referencedBy.length} Referenzen
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`text-neutral-400 transition-transform ${expanded === e.code ? "rotate-90" : ""}`}
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
            {expanded === e.code && (
              <div className="anim-rise space-y-3 border-t border-neutral-100 px-4 py-3">
                {e.quotes.map((q, i) => (
                  <blockquote
                    key={i}
                    className="rounded-r-lg border-l-4 border-[#0a5cd5] bg-blue-50/60 px-4 py-2 text-sm italic leading-relaxed text-neutral-700"
                  >
                    „{q.text}“
                    <button
                      type="button"
                      onClick={() => onOpen(q.note)}
                      className="ml-2 cursor-pointer font-semibold not-italic text-[#004a99] hover:underline"
                    >
                      — {q.source}
                    </button>
                  </blockquote>
                ))}
                {e.referencedBy.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {e.referencedBy.map((n) => (
                      <button
                        key={n.path}
                        type="button"
                        onClick={() => onOpen(n)}
                        className="cursor-pointer rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-200"
                      >
                        {TYPE_LABEL[n.type] ?? n.type}:{" "}
                        {n.title.length > 40 ? n.title.slice(0, 40) + "…" : n.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
