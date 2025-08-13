"use client";

import { useEffect, useState } from "react";
import { getSession } from "@lib/auth/session";
import { getFavoriteEventIds, toggleFavorite } from "@lib/auth/ownership";

export default function FavoriteButton({ slug }: { slug: string }) {
  const [isFav, setIsFav] = useState<boolean>(false);
  const [disabled, setDisabled] = useState<boolean>(false);

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    const favs = getFavoriteEventIds(session.user.id);
    setIsFav(favs.includes(slug));
  }, [slug]);

  const onToggle = () => {
    const session = getSession();
    if (!session) return;
    setDisabled(true);
    const next = toggleFavorite(session.user.id, slug);
    setIsFav(next);
    setDisabled(false);
  };

  return (
    <button
      className={`px-3 py-1 rounded ${isFav ? "bg-red-600 text-white" : "bg-gray-200"}`}
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={isFav}
      aria-label={isFav ? "Treure de favorits" : "Afegir a favorits"}
      title={isFav ? "Treure de favorits" : "Afegir a favorits"}
    >
      {isFav ? "Favorit" : "Afegir a favorits"}
    </button>
  );
}