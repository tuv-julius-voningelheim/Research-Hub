"use client";

// Reusable read-only-link manager for projects, programs and divisions.

import { useState } from "react";
import { useHub } from "@/lib/store";
import { shareKindOf, shareTargetOf, type ShareKind } from "@/lib/types";
import { Modal, btnSecondary, inputCls } from "@/components/ui";

const KIND_LABEL: Record<ShareKind, string> = {
  project: "dieses Projekts",
  program: "dieses Programs (inkl. aller Projekte)",
  division: "dieser Division (inkl. aller Programs & Projekte)",
};

export default function ShareModal({
  kind,
  targetId,
  onClose,
}: {
  kind: ShareKind;
  targetId: string;
  onClose: () => void;
}) {
  const { state, createShare, removeShare } = useHub();
  const [copied, setCopied] = useState<string | null>(null);

  const shares = (state.shares ?? []).filter(
    (s) => shareKindOf(s) === kind && shareTargetOf(s) === targetId
  );

  return (
    <Modal title="Read-only-Link teilen" onClose={onClose}>
      <p className="mb-4 text-sm leading-relaxed text-neutral-600">
        Wer den Link hat, sieht die Ergebnisse {KIND_LABEL[kind]} —
        schreibgeschützt, mit eigener Suche, ohne Zugriff auf den Rest des Hubs.
        Links lassen sich jederzeit widerrufen.
      </p>

      {shares.length === 0 ? (
        <p className="mb-4 rounded-lg bg-neutral-50 px-3 py-4 text-center text-sm text-neutral-400 ring-1 ring-neutral-200">
          Noch kein Link erstellt.
        </p>
      ) : (
        <ul className="mb-4 space-y-2">
          {shares.map((s) => {
            const url = `${window.location.origin}/share/${s.token}`;
            return (
              <li key={s.token} className="flex items-center gap-2">
                <input
                  readOnly
                  className={`${inputCls} font-mono text-xs`}
                  value={url}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={async () => {
                    await navigator.clipboard.writeText(url).catch(() => {});
                    setCopied(s.token);
                    setTimeout(() => setCopied(null), 1500);
                  }}
                >
                  {copied === s.token ? "Kopiert ✓" : "Kopieren"}
                </button>
                <button
                  type="button"
                  title="Link widerrufen"
                  onClick={() => removeShare(s.token)}
                  className="cursor-pointer rounded-lg p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        className="w-full cursor-pointer rounded-lg bg-[#0057b8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#004a99]"
        onClick={async () => {
          const share = createShare(kind, targetId);
          const url = `${window.location.origin}/share/${share.token}`;
          await navigator.clipboard.writeText(url).catch(() => {});
          setCopied(share.token);
          setTimeout(() => setCopied(null), 1500);
        }}
      >
        + Neuen Link erstellen (wird kopiert)
      </button>
    </Modal>
  );
}
