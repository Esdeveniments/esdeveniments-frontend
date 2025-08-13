"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearSession, getSession } from "@lib/auth/session";
import { Session } from "types/user";
import { useRouter } from "next/navigation";

export default function DashboardHome() {
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();

  useEffect(() => {
    setSession(getSession());
  }, []);

  return (
    <div className="w-full flex justify-center bg-whiteCorp py-8">
      <div className="w-full sm:w-[520px] px-4 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">El teu panell</h1>
        {session && <p>Hola, {session.user.name}</p>}
        <div className="flex gap-3">
          <Link className="text-primary underline" href="/dashboard/events">Els meus esdeveniments</Link>
          <Link className="text-primary underline" href="/dashboard/favorites">Favorits</Link>
          <Link className="text-primary underline" href="/dashboard/events/new">Crea esdeveniment</Link>
        </div>
        <div>
          <button
            className="text-sm text-red-600 underline"
            onClick={() => {
              clearSession();
              router.replace("/");
            }}
          >
            Tancar sessió
          </button>
        </div>
      </div>
    </div>
  );
}