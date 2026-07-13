"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useHub } from "@/lib/store";
import TuvLogo from "@/components/TuvLogo";

const NAV: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/divisions",
    label: "Divisions",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="2" width="6" height="6" rx="1" />
        <rect x="2" y="16" width="6" height="6" rx="1" />
        <rect x="16" y="16" width="6" height="6" rx="1" />
        <path d="M12 8v4m0 0H5v4m7-4h7v4" />
      </svg>
    ),
  },
  {
    href: "/programs",
    label: "Programs",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="6" cy="6" r="3" />
        <circle cx="18" cy="18" r="3" />
        <path d="M6 9v3a3 3 0 0 0 3 3h6" />
      </svg>
    ),
  },
  {
    href: "/projects",
    label: "Projects",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      </svg>
    ),
  },
  {
    href: "/search",
    label: "Search",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
  },
];

function SyncBadge() {
  const { mode, syncError } = useHub();
  const cls =
    syncError
      ? "border-red-200 bg-red-50/60 text-red-700"
      : mode === "shared"
        ? "border-emerald-200 bg-emerald-50/60 text-emerald-700"
        : "border-neutral-200 bg-neutral-50 text-neutral-500";
  const label = syncError
    ? "Sync error · retrying"
    : mode === "shared"
      ? "Shared · live"
      : mode === "local"
        ? "Local · this browser"
        : "Connecting…";
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${cls}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 17.6a5 5 0 0 0-3-9 7 7 0 0 0-13 3 4.5 4.5 0 0 0 .5 9H19a4 4 0 0 0 1-3z" />
      </svg>
      {label}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-neutral-200/70 bg-white/85 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-5 py-5">
        <TuvLogo size={38} />
        <div>
          <div className="text-[15px] font-extrabold leading-tight tracking-tight text-neutral-900">
            Insight Hub
          </div>
          <div className="text-xs font-medium text-neutral-500">UX Research</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
          Menu
        </div>
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                    active
                      ? "bg-gradient-to-b from-[#0a5cd5] to-[#004a99] text-white shadow-[0_2px_6px_rgba(0,74,153,0.35)]"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  }`}
                >
                  <span className={active ? "text-white/90" : "text-neutral-400"}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 pb-4">
        <SyncBadge />
      </div>
    </aside>
  );
}
