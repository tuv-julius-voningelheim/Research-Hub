"use client";

// Small horizontal bar rows for distributions (shared across dashboards).

import { useLang } from "@/lib/i18n";

export const SEVERITY_COLOR: Record<string, string> = {
  kritisch: "#b3261e",
  hoch: "#c4540a",
  mittel: "#a37200",
  niedrig: "#8a8a85",
};

export function BarRow({
  label,
  count,
  max,
  color = "#2a78d6",
}: {
  label: string;
  count: number;
  max: number;
  color?: string;
}) {
  const { t } = useLang();
  // distribution labels are lowercase German keys (hoch, funktional, …) —
  // capitalise, then localise
  const display = t(label.charAt(0).toUpperCase() + label.slice(1));
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 shrink-0 truncate text-sm font-semibold text-neutral-700">
        {display}
      </div>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${(count / Math.max(1, max)) * 100}%`, background: color }}
        />
      </div>
      <div className="w-6 shrink-0 text-right text-sm font-bold text-neutral-800">
        {count}
      </div>
    </div>
  );
}
