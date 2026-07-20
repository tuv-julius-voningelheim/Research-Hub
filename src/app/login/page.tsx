"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useLang } from "@/lib/i18n";

function LoginForm() {
  const searchParams = useSearchParams();
  const { t } = useLang();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const from = searchParams.get("from");
        // full reload so middleware + shared-workspace load run fresh with the cookie
        window.location.href = from && from.startsWith("/") ? from : "/";
        return;
      }
      setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="anim-scale w-full max-w-sm rounded-3xl border border-neutral-200/70 bg-white p-8 shadow-[0_8px_30px_rgba(16,24,40,0.08)]"
    >
      <div className="mb-6 flex items-center gap-3">
        <Image src="/tuv-sud-logo.png" alt="TÜV SÜD" width={44} height={44} priority />
        <div>
          <div className="text-lg font-extrabold tracking-tight text-neutral-900">
            Insight Hub
          </div>
          <div className="text-xs font-medium text-neutral-500">UX Research · TÜV SÜD</div>
        </div>
      </div>

      <label className="mb-1 block text-xs font-bold text-neutral-600">{t("Passwort")}</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-[#0a5cd5] focus:ring-2 focus:ring-blue-100"
        placeholder={t("Team-Passwort")}
      />
      {error && (
        <p className="mt-2 text-sm font-semibold text-red-600">{t("Falsches Passwort.")}</p>
      )}
      <button
        type="submit"
        disabled={busy || !password}
        className="mt-4 w-full cursor-pointer rounded-lg bg-[#004a99] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#003b7a] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? t("Prüfe…") : t("Anmelden")}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f4f5f7] px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
