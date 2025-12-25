"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import HeartIconSolid from "@heroicons/react/solid/esm/HeartIcon";
import HeartIconOutline from "@heroicons/react/outline/esm/HeartIcon";

import Button from "@components/ui/common/button";
import type { FavoriteButtonProps } from "types/props";

export default function FavoriteButton({
  eventSlug,
  initialIsFavorite,
  labels,
  className = "",
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  const ariaLabel = isFavorite ? labels.remove : labels.add;
  const Icon = isFavorite ? HeartIconSolid : HeartIconOutline;

  return (
    <Button
      type="button"
      variant="ghost"
      className={["group p-2", className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
      aria-pressed={isFavorite}
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();

        const nextIsFavorite = !isFavorite;
        setIsFavorite(nextIsFavorite);

        startTransition(async () => {
          try {
            const response = await fetch("/api/favorites", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                eventSlug,
                shouldBeFavorite: nextIsFavorite,
              }),
            });

            if (!response.ok) {
              throw new Error("Failed to update favorites");
            }

            // Preserve existing /preferits UX: reflect removals immediately.
            // Avoid refreshing other pages to keep the toggle lightweight.
            if (pathname.endsWith("/preferits")) {
              router.refresh();
            }
          } catch {
            setIsFavorite(!nextIsFavorite);
          }
        });
      }}
    >
      <Icon
        className="h-6 w-6 text-primary transition-transform duration-200 group-hover:scale-[1.06] group-active:scale-[0.96]"
      />
    </Button>
  );
}
