"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LangToggle, useLang } from "@/lib/i18n";
import { useHub } from "@/lib/store";

const NAV: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/divisions",
    label: "Divisions",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="9" y="2" width="6" height="6" rx="1.5" />
        <rect x="2" y="16" width="6" height="6" rx="1.5" />
        <rect x="16" y="16" width="6" height="6" rx="1.5" />
        <path d="M12 8v4m0 0H5v4m7-4h7v4" />
      </svg>
    ),
  },
  {
    href: "/programs",
    label: "Programs",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      </svg>
    ),
  },
  {
    href: "/search",
    label: "Search",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
  },
];

function SyncBadge() {
  const { mode, syncError } = useHub();
  const { t } = useLang();
  const dot = syncError
    ? "bg-red-500"
    : mode === "shared"
      ? "bg-emerald-500"
      : "bg-neutral-400";
  const label = syncError
    ? t("Sync-Fehler")
    : mode === "shared"
      ? "Shared · live"
      : mode === "local"
        ? t("Lokal · dieser Browser")
        : t("Verbinde…");
  return (
    <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-600 ring-1 ring-neutral-200">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useLang();
  return (
    <ul className="space-y-0.5">
      {NAV.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-blue-50/80 font-semibold text-[#0057b8]"
                  : "font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              <span className={active ? "text-[#0057b8]" : "text-neutral-400"}>
                {item.icon}
              </span>
              {t(item.label)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** mobile: sticky top bar + slide-over menu (rendered < lg) */
export function MobileTopBar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          aria-label="Menü öffnen"
          onClick={() => setOpen(true)}
          className="cursor-pointer rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Image src="/tuv-sud-logo.png" alt="TÜV SÜD" width={28} height={28} />
        <span className="text-[15px] font-bold tracking-tight text-neutral-900">
          Insight Hub
        </span>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="anim-fade absolute inset-0 bg-neutral-900/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between px-5 py-5">
              <div className="flex items-center gap-3">
                <Image src="/tuv-sud-logo.png" alt="TÜV SÜD" width={34} height={34} />
                <div>
                  <div className="text-[15px] font-bold leading-tight tracking-tight text-neutral-900">
                    Insight Hub
                  </div>
                  <div className="text-xs text-neutral-500">UX Research</div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Menü schließen"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 px-3">
              <NavList onNavigate={() => setOpen(false)} />
            </nav>
            <div className="space-y-2 px-3 pb-4">
              <LangToggle />
              <SyncBadge />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Sidebar() {
  const { t } = useLang();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-neutral-200 bg-white lg:flex">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <Image
          src="/tuv-sud-logo.png"
          alt="TÜV SÜD"
          width={38}
          height={38}
          priority
        />
        <div>
          <div className="text-[15px] font-bold leading-tight tracking-tight text-neutral-900">
            Insight Hub
          </div>
          <div className="text-xs text-neutral-500">UX Research</div>
        </div>
      </div>

      <nav className="flex-1 px-3">
        <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
          {t("Menü")}
        </div>
        <NavList />
      </nav>

      <div className="space-y-2 px-3 pb-4">
        <LangToggle />
        <SyncBadge />
      </div>
    </aside>
  );
}
