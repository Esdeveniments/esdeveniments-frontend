"use client";

import { useEffect, useState } from "react";

interface SessionItem { token: string; createdAt: number; expiresAt: number }

export default function AccountPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);

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
      </div>
    </div>
  );
}