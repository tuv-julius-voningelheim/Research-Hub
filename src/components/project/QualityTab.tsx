"use client";

// "Vault-Lint": programmatic checks against the vault's own SOP rules.

import { useMemo } from "react";
import { lintVault, type LintLevel } from "@/lib/analytics";
import type { Note, Vault } from "@/lib/types";
import { Card, EmptyState, StatTile } from "@/components/ui";
import { TypePill } from "./NoteDrawer";

const LEVEL_META: Record<
  LintLevel,
  { label: string; icon: React.ReactNode; cls: string }
> = {
  error: {
    label: "Verstoß",
    cls: "bg-red-50 text-red-700 ring-red-200",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M15 9l-6 6M9 9l6 6" />
      </svg>
    ),
  },
  warning: {
    label: "Warnung",
    cls: "bg-amber-50 text-amber-700 ring-amber-200",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />
      </svg>
    ),
  },
  info: {
    label: "Hinweis",
    cls: "bg-blue-50 text-blue-700 ring-blue-200",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
  },
};

export default function QualityTab({
  vault,
  onOpen,
}: {
  vault: Vault;
  onOpen: (n: Note) => void;
}) {
  const findings = useMemo(() => lintVault(vault), [vault]);
  const counts = {
    error: findings.filter((f) => f.level === "error").length,
    warning: findings.filter((f) => f.level === "warning").length,
    info: findings.filter((f) => f.level === "info").length,
  };

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-neutral-500">
        Automatische Prüfung gegen die Regeln der Methodik (
        <span className="font-semibold">08_methods</span>): Persona erst ab 3
        Interviews, Pain Point → genau ein Theme, Recommendation → genau ein
        Anker-Insight, Confidence muss zur Evidenz passen.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <StatTile value={counts.error} label="Verstöße" tone="orange" />
        <StatTile value={counts.warning} label="Warnungen" tone="neutral" />
        <StatTile value={counts.info} label="Hinweise" tone="blue" />
      </div>

      {findings.length === 0 ? (
        <EmptyState
          title="Alles sauber ✓"
          hint="Der Export erfüllt alle geprüften SOP-Regeln."
        />
      ) : (
        <Card className="divide-y divide-neutral-100">
          {findings.map((f, i) => {
            const meta = LEVEL_META[f.level];
            return (
              <button
                key={i}
                type="button"
                onClick={() => onOpen(f.note)}
                className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-blue-50/40"
              >
                <span
                  className={`mt-0.5 flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${meta.cls}`}
                >
                  {meta.icon}
                  {meta.label}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-neutral-800">
                    {f.rule}
                  </span>
                  <span className="block text-sm text-neutral-600">{f.message}</span>
                  <span className="mt-1 block truncate text-xs text-neutral-400">
                    {f.note.title}
                  </span>
                </span>
                <TypePill type={f.note.type} />
              </button>
            );
          })}
        </Card>
      )}
    </div>
  );
}
