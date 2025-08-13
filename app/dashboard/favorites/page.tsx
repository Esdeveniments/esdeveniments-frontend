"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSession } from "@lib/auth/session";
import { getFavoriteEventIds } from "@lib/auth/ownership";

export default function FavoritesPage() {
  const [favIds, setFavIds] = useState<string[]>([]);

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    setFavIds(getFavoriteEventIds(session.user.id));
  }, []);

  return (
    <div className="w-full flex justify-center bg-whiteCorp py-8">
      <div className="w-full sm:w-[520px] px-4 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Esdeveniments favorits</h1>
        {favIds.length === 0 ? (
          <p>No tens favorits encara.</p>
        ) : (
          <ul className="list-disc pl-5">
            {favIds.map((slug) => (
              <li key={slug}>
                <Link className="text-primary underline" href={`/e/${slug}`}>{slug}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}