"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiLogout, getCurrentUser } from "@lib/auth/session";
import { User } from "types/user";
import { useRouter } from "next/navigation";

export default function DashboardHome() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => setUser(await getCurrentUser()))();
  }, []);

  return (
    <div className="w-full flex justify-center bg-whiteCorp py-8">
      <div className="w-full sm:w-[520px] px-4 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">El teu panell</h1>
        {user && <p>Hola, {user.name}</p>}
        <div className="flex gap-3">
          <Link className="text-primary underline" href="/dashboard/events">Els meus esdeveniments</Link>
          <Link className="text-primary underline" href="/dashboard/favorites">Favorits</Link>
          <Link className="text-primary underline" href="/dashboard/events/new">Crea esdeveniment</Link>
        </div>
        <div>
          <button
            className="text-sm text-red-600 underline"
            onClick={async () => {
              await apiLogout();
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