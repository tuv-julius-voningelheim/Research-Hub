"use client";

// App chrome: sidebar + content column. Chromeless routes (login, public
// share links, print report) render bare.

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import ConflictBanner from "@/components/ConflictBanner";
import Sidebar from "@/components/Sidebar";

const BARE_PREFIXES = ["/login", "/share"];

export default function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bare =
    BARE_PREFIXES.some((p) => pathname.startsWith(p)) ||
    /^\/projects\/[^/]+\/report/.test(pathname);

  if (bare) return <>{children}</>;

  return (
    <>
      <ConflictBanner />
      <Sidebar />
      <main className="ml-60 min-h-screen px-10 py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </>
  );
}
