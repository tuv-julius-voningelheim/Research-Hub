"use client";

// Workspace status banners: sync conflict, suspended storage (quota) and
// "server empty but local data present" recovery offer.

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { useHub } from "@/lib/store";

function Banner({
  tone,
  icon,
  text,
  action,
}: {
  tone: "amber" | "red" | "blue";
  icon: React.ReactNode;
  text: React.ReactNode;
  action?: React.ReactNode;
}) {
  const cls =
    tone === "red"
      ? "border-red-200 bg-red-50/95 text-red-900"
      : tone === "blue"
        ? "border-blue-200 bg-blue-50/95 text-blue-900"
        : "border-amber-200 bg-amber-50/95 text-amber-900";
  return (
    <div className="anim-rise fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-3">
      <div className={`flex max-w-2xl items-center gap-3 rounded-2xl border px-4 py-2.5 shadow-lg backdrop-blur ${cls}`}>
        {icon}
        <span className="text-sm font-semibold">{text}</span>
        {action}
      </div>
    </div>
  );
}

export default function ConflictBanner() {
  const {
    conflict,
    reloadShared,
    storageDown,
    serverEmptyLocalData,
    restoreToServer,
  } = useHub();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);

  if (serverEmptyLocalData) {
    return (
      <Banner
        tone="blue"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2">
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16" />
            <path d="M21 3v5h-5M3 21v-5h5" />
          </svg>
        }
        text={t("Der Server-Workspace ist leer, aber dieser Browser hat einen gespeicherten Stand.")}
        action={
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await restoreToServer();
              setBusy(false);
            }}
            className="shrink-0 cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? t("Stelle wieder her…") : t("Auf Server wiederherstellen")}
          </button>
        }
      />
    );
  }

  if (storageDown) {
    return (
      <Banner
        tone="amber"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92600a" strokeWidth="2">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />
          </svg>
        }
        text={t("Der Speicherdienst ist vorübergehend nicht erreichbar (Nutzungslimit). Deine Daten sind sicher — du arbeitest lokal, bis er wieder verfügbar ist.")}
      />
    );
  }

  if (conflict) {
    return (
      <Banner
        tone="amber"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92600a" strokeWidth="2">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />
          </svg>
        }
        text={t("Der Workspace wurde von jemand anderem geändert.")}
        action={
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await reloadShared();
              setBusy(false);
            }}
            className="shrink-0 cursor-pointer rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            {busy ? t("Lade…") : t("Neu laden")}
          </button>
        }
      />
    );
  }

  return null;
}
