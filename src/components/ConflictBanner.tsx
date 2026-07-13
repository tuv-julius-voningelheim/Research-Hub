"use client";

import { useState } from "react";
import { useHub } from "@/lib/store";

export default function ConflictBanner() {
  const { conflict, reloadShared } = useHub();
  const [busy, setBusy] = useState(false);

  if (!conflict) return null;

  return (
    <div className="anim-rise fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-3">
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-2.5 shadow-lg backdrop-blur">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92600a" strokeWidth="2">
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />
        </svg>
        <span className="text-sm font-semibold text-amber-900">
          Der Workspace wurde von jemand anderem geändert.
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await reloadShared();
            setBusy(false);
          }}
          className="cursor-pointer rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
        >
          {busy ? "Lade…" : "Neu laden"}
        </button>
      </div>
    </div>
  );
}
