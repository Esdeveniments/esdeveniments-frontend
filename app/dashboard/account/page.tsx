"use client";

import { useEffect, useState } from "react";

interface SessionItem { token: string; createdAt: number; expiresAt: number }

export default function AccountPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [exportJson, setExportJson] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/user/sessions", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions as SessionItem[]);
      }
    })();
  }, []);

  async function revoke(token: string) {
    const res = await fetch("/api/user/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.ok) setSessions((prev) => prev.filter((s) => s.token !== token));
  }

  async function doExport() {
    const res = await fetch("/api/user/account", { method: "GET" });
    if (res.ok) setExportJson(JSON.stringify(await res.json(), null, 2));
  }

  async function deleteAccount() {
    if (!confirm("Segur que vols eliminar el compte?")) return;
    const res = await fetch("/api/user/account", { method: "DELETE" });
    if (res.ok) window.location.href = "/";
  }

  return (
    <div className="w-full flex justify-center bg-whiteCorp py-8">
      <div className="w-full sm:w-[520px] px-4 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">El meu compte</h1>

        <h2 className="text-lg font-medium">Sessions</h2>
        {sessions.length === 0 ? (
          <p>No hi ha sessions actives.</p>
        ) : (
          <ul className="list-disc pl-5">
            {sessions.map((s) => (
              <li key={s.token} className="flex items-center gap-3">
                <span>{new Date(s.createdAt).toLocaleString()} → expira {new Date(s.expiresAt).toLocaleString()}</span>
                <button className="text-sm text-red-600 underline" onClick={() => revoke(s.token)}>Tanca</button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-3">
          <button className="bg-gray-200 px-3 py-2 rounded" onClick={doExport}>Exporta dades</button>
          <button className="bg-red-600 text-white px-3 py-2 rounded" onClick={deleteAccount}>Esborra el compte</button>
        </div>

        {exportJson && (
          <pre className="whitespace-pre-wrap break-all p-3 bg-gray-50 border rounded text-xs">{exportJson}</pre>
        )}
      </div>
    </div>
  );
}