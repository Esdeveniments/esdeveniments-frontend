"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@i18n/routing";
import useSWR from "swr";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import { HeartIcon as HeartIconOutline } from "@heroicons/react/24/outline";

import Button from "@components/ui/common/button";
import { sendGoogleEvent } from "@utils/analytics";
import { queueFavoriteRequest } from "@utils/favorites-queue";
import type { FavoriteButtonProps } from "types/props";
import { captureException } from "@sentry/nextjs";

const FAVORITES_SWR_KEY = "favorites:list";

function parseMaxFavorites(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const maybe = (payload as Record<string, unknown>).maxFavorites;
  return typeof maybe === "number" ? maybe : null;
}

function isMaxReachedPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  return (payload as Record<string, unknown>).error === "MAX_FAVORITES_REACHED";
}

export default function FavoriteButton({
  eventSlug,
  eventId,
  eventTitle,
  initialIsFavorite,
  labels,
  className = "",
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isMutatingRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Components.FavoriteButton");

  const { data: favoritesData, mutate: mutateFavorites } = useSWR<
    { ok: true; favorites: string[] } | { ok: false; error: string }
  >(
    FAVORITES_SWR_KEY,
    async () => {
      const res = await fetch("/api/favorites", { method: "GET" });
      if (!res.ok) throw new Error("Failed to fetch favorites");
      return res.json() as Promise<
        { ok: true; favorites: string[] } | { ok: false; error: string }
      >;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      dedupingInterval: 30_000,
    }
  );

  useEffect(() => {
    if (isMutatingRef.current) return;
    if (!favoritesData || favoritesData.ok !== true) return;
    setIsFavorite(favoritesData.favorites.includes(eventSlug));
  }, [favoritesData, eventSlug]);

  const ariaLabel = isFavorite ? labels.remove : labels.add;
  const Icon = isFavorite ? HeartIconSolid : HeartIconOutline;

  return (
    <div className="relative">
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

          setLimitMessage(null);
          const nextIsFavorite = !isFavorite;
          setIsFavorite(nextIsFavorite);

          startTransition(async () => {
            isMutatingRef.current = true;
            try {
              const response = await queueFavoriteRequest(() =>
                fetch("/api/favorites", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    eventSlug,
                    shouldBeFavorite: nextIsFavorite,
                  }),
                })
              );

              if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as unknown;
                if (response.status === 409 && isMaxReachedPayload(payload)) {
                  const max = parseMaxFavorites(payload);
                  sendGoogleEvent("favorites_limit_reached", {
                    action: "add",
                    max_favorites: max,
                    event_slug: eventSlug,
                    event_id: eventId,
                    event_title: eventTitle,
                  });
                  setLimitMessage(t("maxReached", { max: max ?? "" }));
                  setIsFavorite(!nextIsFavorite);
                  return;
                }

                throw new Error("Failed to update favorites");
              }

              const payload = (await response.json().catch(() => null)) as unknown;
              if (
                payload &&
                typeof payload === "object" &&
                "favorites" in payload &&
                Array.isArray((payload as { favorites?: unknown }).favorites)
              ) {
                const favorites = (payload as { favorites: unknown[] }).favorites
                  .filter((value): value is string => typeof value === "string")
                  .map((value) => value.trim())
                  .filter(Boolean);

                mutateFavorites({ ok: true, favorites }, { revalidate: false });
              }

              const analyticsEventName = nextIsFavorite
                ? "favorite_add"
                : "favorite_remove";

              sendGoogleEvent(analyticsEventName, {
                event_slug: eventSlug,
                event_id: eventId,
                event_title: eventTitle,
              });

              // Preserve existing /preferits UX: reflect removals immediately.
              // Avoid refreshing other pages to keep the toggle lightweight.
              if (pathname.endsWith("/preferits")) {
                router.refresh();
              }
            } catch (error: unknown) {
              captureException(error, {
                tags: { feature: "favorites" },
                extra: {
                  event_slug: eventSlug,
                  event_id: eventId,
                  event_title: eventTitle,
                  next_is_favorite: nextIsFavorite,
                },
              });
              setIsFavorite(!nextIsFavorite);
            } finally {
              isMutatingRef.current = false;
            }
          });
        }}
      >
        <Icon className={`h-6 w-6 text-primary transition-[transform,color] duration-200 group-hover:scale-[1.06] group-active:scale-[0.96] ${isFavorite ? "animate-heartBeat" : ""}`} />
      </Button>

      {limitMessage && (
        <div
          role="status"
          aria-live="polite"
          className="absolute right-0 top-full mt-1 w-56 rounded-input border border-border bg-background p-2 body-small text-foreground/80"
        >
          {limitMessage}
        </div>
      )}
    </div>
  );
}
