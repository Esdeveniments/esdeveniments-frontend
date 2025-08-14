"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function FavoriteButton({ slug }: { slug: string }) {
  const [isFav, setIsFav] = useState<boolean>(false);
  const [disabled, setDisabled] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // Initialize from API favorites list
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) return;
        const favRes = await fetch("/api/user/favorites", { cache: "no-store" });
        if (favRes.ok) {
          const data = await favRes.json();
          const has = (data.events as { slug: string }[]).some((e) => e.slug === slug);
          setIsFav(has);
        }
      } catch {}
    })();
  }, [slug]);

  const onToggle = async () => {
    setDisabled(true);
    try {
      const res = await fetch("/api/user/favorites/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setIsFav(!!data.isFavorite);
      }
    } finally {
      setDisabled(false);
    }
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