"use client";

// Small shared UI primitives: badges, stat tiles, cards, modal, empty state.

import { useEffect, type ReactNode } from "react";
import type { ProjectStatus } from "@/lib/types";

// ---- status / severity / confidence badges ----
// Status colors carry state — always with a text label, never color alone.

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  planned: "Planned",
  "in-analysis": "In analysis",
  completed: "Completed",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const cls =
    status === "in-analysis"
      ? "bg-[#a35300] text-white"
      : status === "completed"
        ? "bg-[#1e7a3c] text-white"
        : "bg-neutral-500 text-white";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const LEVEL_STYLES: Record<string, string> = {
  kritisch: "bg-[#b3261e] text-white",
  hoch: "bg-[#c4540a] text-white",
  mittel: "bg-[#a37200] text-white",
  niedrig: "bg-neutral-400 text-white",
};

export function LevelBadge({
  level,
  prefix,
}: {
  level?: string;
  prefix?: string;
}) {
  if (!level) return null;
  const key = level.toLowerCase();
  const cls = LEVEL_STYLES[key] ?? "bg-neutral-400 text-white";
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>
      {prefix ? `${prefix} ${label}` : label}
    </span>
  );
}

export function ConfidenceBadge({ level }: { level?: string }) {
  if (!level) return null;
  const key = level.toLowerCase();
  const cls =
    key === "hoch"
      ? "bg-[#e7f2e9] text-[#1e5c31] ring-[#bfdcc7]"
      : key === "mittel"
        ? "bg-[#fdf3e1] text-[#7a5200] ring-[#ecd9ae]"
        : "bg-neutral-100 text-neutral-600 ring-neutral-200";
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${cls}`}
    >
      Confidence {key.charAt(0).toUpperCase() + key.slice(1)}
    </span>
  );
}

export function Chip({ children, tone = "gray" }: { children: ReactNode; tone?: "blue" | "gray" }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        tone === "blue" ? "bg-[#004a99] text-white" : "bg-neutral-500 text-white"
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
  const iconBg =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "orange"
        ? "bg-orange-50 text-orange-700"
        : tone === "neutral"
          ? "bg-neutral-100 text-neutral-600"
          : "bg-blue-50 text-[#004a99]";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      {icon && (
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
      )}
      <div>
        <div className="text-xl font-bold leading-tight text-neutral-900">{value}</div>
        <div className="text-xs text-neutral-500">{label}</div>
      </div>
    </div>
  );
}

// ---- card ----

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-neutral-200 bg-white ${className}`}>
      {children}
    </div>
  );
}

// ---- modal ----

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-[#0a5cd5] focus:ring-2 focus:ring-blue-100";

export const btnPrimary =
  "cursor-pointer rounded-lg bg-[#004a99] px-4 py-2 text-sm font-bold text-white hover:bg-[#003b7a] disabled:cursor-not-allowed disabled:opacity-50";

export const btnSecondary =
  "cursor-pointer rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50";

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
      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-colors ${
        kind === "delete"
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-neutral-300 text-neutral-500 hover:bg-neutral-100"
      }`}
    >
      {kind === "edit" ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white/60 px-6 py-14 text-center">
      <div className="mb-2 text-base font-bold text-neutral-700">{title}</div>
      {hint && <div className="mb-4 max-w-md text-sm text-neutral-500">{hint}</div>}
      {action}
    </div>
  );
}
