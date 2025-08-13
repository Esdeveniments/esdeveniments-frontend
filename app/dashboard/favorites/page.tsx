"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface FavItem { slug: string; title: string }

export default function FavoritesPage() {
  const [favs, setFavs] = useState<FavItem[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/user/favorites", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setFavs(data.events as FavItem[]);
      }
    })();
  }, []);

  return (
    <div className="w-full flex justify-center bg-whiteCorp py-8">
      <div className="w-full sm:w-[520px] px-4 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Esdeveniments favorits</h1>
        {favs.length === 0 ? (
          <p>No tens favorits encara.</p>
        ) : (
          <ul className="list-disc pl-5">
            {favs.map((e) => (
              <li key={e.slug}>
                <Link className="text-primary underline" href={`/e/${e.slug}`}>
                  {e.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}