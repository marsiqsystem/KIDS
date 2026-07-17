"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";

/** The key prompt. On success it reloads, and the server renders the dashboard. */
export default function AdminLogin({ configured }: { configured: boolean }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data?.message ?? "That key is not correct.");
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{ fontFamily: "var(--font-body, system-ui)" }}
      className="flex min-h-screen items-center justify-center bg-[#141010] px-6"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-[#2a2321] bg-[#1c1613] p-7 shadow-2xl"
      >
        <div className="mb-5 flex items-center gap-2.5 text-[#e7d9c6]">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3d0a10]">
            <Lock className="h-4.5 w-4.5 text-[#e5be7a]" aria-hidden="true" />
          </span>
          <div>
            <div className="text-sm font-bold">SET 2026 · Control room</div>
            <div className="text-xs text-[#9c8c86]">Staff only</div>
          </div>
        </div>

        {!configured && (
          <p className="mb-4 rounded-lg border border-[#5a2a12] bg-[#2a1710] px-3 py-2 text-xs leading-relaxed text-[#f0c9a8]">
            No admin key is set on this deployment. Set <code>KIDS_ADMIN_KEY</code> and reload.
          </p>
        )}

        <label className="block text-xs font-semibold uppercase tracking-wide text-[#9c8c86]">
          Admin key
        </label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoFocus
          autoComplete="off"
          className="mt-1.5 w-full rounded-lg border border-[#3a2f2b] bg-[#0f0b0a] px-3 py-2.5 text-sm text-[#f3ece2] outline-none focus:border-[#c9a24b]"
          placeholder="Paste your key"
        />

        {error && <p className="mt-3 text-xs text-[#f0a8a8]">{error}</p>}

        <button
          type="submit"
          disabled={busy || !key}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#c9a24b] py-2.5 text-sm font-bold text-[#3d0a10] transition hover:brightness-105 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
