"use client";

// Shared UI primitives — calm, single-accent design language:
// white cards with hairline borders, soft tinted badges, flat buttons.

import { useEffect, type ReactNode } from "react";
import { useLang } from "@/lib/i18n";
import type { ProjectStatus } from "@/lib/types";

export const ACCENT = "#0057b8";

// ---- status / severity / confidence badges ----
// State always ships with a text label, never color alone.

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  planned: "Planned",
  "in-analysis": "In analysis",
  completed: "Completed",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const { t } = useLang();
  const cls =
    status === "in-analysis"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : status === "completed"
        ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
        : "bg-neutral-100 text-neutral-600 ring-neutral-200";
  const dot =
    status === "in-analysis"
      ? "bg-amber-500"
      : status === "completed"
        ? "bg-emerald-500"
        : "bg-neutral-400";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {t(STATUS_LABEL[status])}
    </span>
  );
}

const LEVEL_STYLES: Record<string, string> = {
  kritisch: "bg-red-50 text-red-800 ring-red-200",
  hoch: "bg-orange-50 text-orange-800 ring-orange-200",
  mittel: "bg-amber-50 text-amber-800 ring-amber-200",
  niedrig: "bg-neutral-100 text-neutral-600 ring-neutral-200",
};

export function LevelBadge({
  level,
  prefix,
}: {
  level?: string;
  prefix?: string;
}) {
  const { t } = useLang();
  if (!level) return null;
  const key = level.toLowerCase();
  const cls = LEVEL_STYLES[key] ?? "bg-neutral-100 text-neutral-600 ring-neutral-200";
  const label = t(key.charAt(0).toUpperCase() + key.slice(1));
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${cls}`}
    >
      {prefix ? `${prefix} ${label}` : label}
    </span>
  );
}

export function ConfidenceBadge({ level }: { level?: string }) {
  const { t } = useLang();
  if (!level) return null;
  const key = level.toLowerCase();
  const cls =
    key === "hoch"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : key === "mittel"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-neutral-100 text-neutral-600 ring-neutral-200";
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${cls}`}
    >
      Confidence {t(key.charAt(0).toUpperCase() + key.slice(1))}
    </span>
  );
}

export function Chip({ children, tone = "gray" }: { children: ReactNode; tone?: "blue" | "gray" }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
        tone === "blue"
          ? "bg-blue-50 text-[#0057b8] ring-blue-200"
          : "bg-neutral-100 text-neutral-600 ring-neutral-200"
      }`}
    >
      {children}
    </span>
  );
}

// ---- stat tile ----

export function StatTile({
  value,
  label,
  icon,
  tone = "blue",
}: {
  value: ReactNode;
  label: string;
  icon?: ReactNode;
  tone?: "blue" | "green" | "orange" | "neutral";
}) {
  const iconCls =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "orange"
        ? "bg-orange-50 text-orange-700"
        : tone === "neutral"
          ? "bg-neutral-100 text-neutral-600"
          : "bg-blue-50 text-[#0057b8]";
  return (
    <div className="elev flex items-center gap-3.5 rounded-xl border border-neutral-200 bg-white px-4 py-3.5">
      {icon && (
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconCls}`}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-xl font-bold leading-tight tracking-tight text-neutral-900">
          {value}
        </div>
        <div className="truncate text-xs text-neutral-500">{label}</div>
      </div>
    </div>
  );
}

// ---- card ----

export function Card({
  children,
  className = "",
  hover,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`elev ${hover ? "elev-hover" : ""} rounded-xl border border-neutral-200 bg-white ${className}`}
    >
      {children}
    </div>
  );
}

// ---- page header ----

export function PageHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-neutral-900">{title}</h1>
        {sub && <p className="mt-1 text-sm text-neutral-500">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ---- modal ----

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`anim-scale w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_20px_50px_rgba(16,24,40,0.18)]`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-neutral-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---- form primitives ----

export const inputCls =
  "w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-900 outline-none transition-shadow placeholder:text-neutral-400 focus:border-[#0057b8] focus:ring-4 focus:ring-blue-600/10";

export const btnPrimary =
  "cursor-pointer rounded-lg bg-[#0057b8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#004a99] active:bg-[#003d80] disabled:cursor-not-allowed disabled:opacity-50";

export const btnSecondary =
  "cursor-pointer rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50";

export const btnDanger =
  "cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700";

// ---- icon buttons (edit / delete) ----

export function IconButton({
  kind,
  onClick,
  label,
}: {
  kind: "edit" | "delete";
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-neutral-400 transition-colors ${
        kind === "delete" ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-neutral-100 hover:text-neutral-700"
      }`}
    >
      {kind === "edit" ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
      )}
    </button>
  );
}

// ---- empty state ----

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="anim-rise flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
      <div className="mb-1.5 text-[15px] font-semibold text-neutral-800">{title}</div>
      {hint && <div className="mb-4 max-w-md text-sm leading-relaxed text-neutral-500">{hint}</div>}
      {action}
    </div>
  );
}

// ---- section heading ----

export function SectionTitle({
  children,
  sub,
}: {
  children: ReactNode;
  sub?: string;
}) {
  return (
    <div className="mb-3">
      <h3 className="text-[15px] font-bold tracking-tight text-neutral-900">{children}</h3>
      {sub && <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{sub}</p>}
    </div>
  );
}
