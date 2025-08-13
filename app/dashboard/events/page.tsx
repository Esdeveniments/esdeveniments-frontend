"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface OwnedEventItem { slug: string; title: string }

export default function MyEventsPage() {
  const [events, setEvents] = useState<OwnedEventItem[]>([]);

  async function load() {
    const res = await fetch("/api/user/events", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events as OwnedEventItem[]);
    } else if (res.status === 401) {
      // noop; middleware should already redirect
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(slug: string) {
    const res = await fetch(`/api/user/events/${slug}`, { method: "DELETE" });
    if (res.ok) setEvents((prev) => prev.filter((e) => e.slug !== slug));
  }

  return (
    <div className="w-full flex justify-center bg-whiteCorp py-8">
      <div className="w-full sm:w-[520px] px-4 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Els meus esdeveniments</h1>
        {events.length === 0 ? (
          <p>Encara no tens esdeveniments creats.</p>
        ) : (
          <ul className="list-disc pl-5">
            {events.map((e) => (
              <li key={e.slug} className="flex items-center gap-3">
                <Link className="text-primary underline" href={`/e/${e.slug}`}>
                  {e.title}
                </Link>
                <Link className="text-sm text-gray-700 underline" href={`/e/${e.slug}/edita`}>
                  Edita
                </Link>
                <button className="text-sm text-red-600 underline" onClick={() => onDelete(e.slug)}>
                  Elimina
                </button>
              </li>
            ))}
          </ul>
        )}
        <Link className="text-primary underline" href="/dashboard/events/new">
          Crea un nou esdeveniment
        </Link>
      </div>
    </div>
  );
}