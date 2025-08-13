"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSession } from "@lib/auth/session";
import { getOwnedEventIds } from "@lib/auth/ownership";

export default function MyEventsPage() {
  const [eventIds, setEventIds] = useState<string[]>([]);

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    setEventIds(getOwnedEventIds(session.user.id));
  }, []);

  return (
    <div className="w-full flex justify-center bg-whiteCorp py-8">
      <div className="w-full sm:w-[520px] px-4 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Els meus esdeveniments</h1>
        {eventIds.length === 0 ? (
          <p>Encara no tens esdeveniments creats.</p>
        ) : (
          <ul className="list-disc pl-5">
            {eventIds.map((slug) => (
              <li key={slug}>
                <Link className="text-primary underline" href={`/e/${slug}`}>{slug}</Link>
              </li>
            ))}
          </ul>
        )}
        <Link className="text-primary underline" href="/dashboard/events/new">Crea un nou esdeveniment</Link>
      </div>
    </div>
  );
}