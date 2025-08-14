"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function EventHeader({ title, slug }: { title: string; slug: string }) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch("/api/auth/me", { cache: "no-store" });
        if (!me.ok) return;
        const res = await fetch("/api/user/events", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const owned = (data.events as { slug: string }[]).some((e) => e.slug === slug);
        setIsOwner(owned);
      } catch {}
    })();
  }, [slug]);

  return (
    <div className="w-full flex items-center justify-between px-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {isOwner && (
        <div className="flex items-center gap-3 text-sm">
          <Link className="text-gray-700 underline" href={`/e/${slug}/edita`}>
            Edita
          </Link>
          {/* Delete could be wired to a moderation flow or API if implemented */}
        </div>
      )}
    </div>
  );
}
