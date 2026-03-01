"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowTopRightOnSquareIcon,
  CalendarIcon,
  HeartIcon as HeartOutline,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import { sendGoogleEvent } from "@utils/analytics";
import type { EventStickyCTAProps } from "types/props";

/**
 * Returns the real FavoriteButton element on the page.
 * We look for the button with aria-label matching the favorite labels.
 */
function findFavoriteButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(
    "[data-favorite-button]"
  );
}

/**
 * Sticky CTA bar for event detail pages on mobile.
 * Sits above the bottom navigation bar (bottom-16 = 64px to clear the h-16 nav).
 * Hidden on desktop (md:hidden) and only visible when user scrolls past the hero.
 *
 * The Save button delegates to the real FavoriteButton on the page to stay in sync
 * with the cookie-based API favorites system.
 */
export default function EventStickyCTA({
  eventUrl,
  eventSlug,
  labels,
}: EventStickyCTAProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(() => {
    if (typeof window === "undefined") return false;
    const btn = findFavoriteButton();
    return btn?.getAttribute("aria-pressed") === "true";
  });
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Sync favorite state from the real FavoriteButton's aria-pressed attribute
  const syncFavoriteState = useCallback(() => {
    const btn = findFavoriteButton();
    if (btn) {
      setIsFavorite(btn.getAttribute("aria-pressed") === "true");
    }
  }, []);

  useEffect(() => {
    // Show the sticky bar once the user scrolls past the event title (h1).
    const titleElement = document.querySelector("article h1");
    if (!titleElement) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observerRef.current.observe(titleElement);

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Observe aria-pressed changes on the real FavoriteButton to stay in sync
  useEffect(() => {
    const btn = findFavoriteButton();
    if (!btn) return;

    const attrObserver = new MutationObserver(() => {
      syncFavoriteState();
    });

    attrObserver.observe(btn, {
      attributes: true,
      attributeFilter: ["aria-pressed"],
    });

    return () => attrObserver.disconnect();
  }, [syncFavoriteState]);

  const handleMoreInfo = () => {
    sendGoogleEvent("sticky_cta_click", {
      action: "more_info",
      event_slug: eventSlug,
    });
  };

  const handleCalendar = () => {
    const calendarSection = document.querySelector("[data-calendar-section]");
    if (calendarSection) {
      calendarSection.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    sendGoogleEvent("sticky_cta_click", {
      action: "add_to_calendar",
      event_slug: eventSlug,
    });
  };

  const handleSave = () => {
    // Delegate to the real FavoriteButton so the cookie-based API stays in sync
    const btn = findFavoriteButton();
    if (btn) {
      btn.click();
    }
    sendGoogleEvent("sticky_cta_click", {
      action: isFavorite ? "unsave" : "save",
      event_slug: eventSlug,
    });
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-16 left-0 right-0 z-40 md:hidden"
      role="toolbar"
      aria-label="Event actions"
    >
      <div className="bg-background/95 backdrop-blur-md border-t border-border shadow-lg">
        <div className="flex items-center justify-evenly gap-1 px-section-x py-2">
          {/* More info - links to external event URL */}
          {eventUrl && (
            <a
              href={eventUrl}
              target="_blank"
              rel="noreferrer"
              onClick={handleMoreInfo}
              className="btn-primary flex-1 flex-center gap-1 py-2 px-3 label font-semibold"
              data-analytics-link-type="sticky_cta_more_info"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              <span>{labels.moreInfo}</span>
            </a>
          )}

          {/* Add to calendar - scrolls to calendar section */}
          <button
            onClick={handleCalendar}
            className="btn-outline flex-1 flex-center gap-1 py-2 px-3 label font-semibold"
            aria-label={labels.calendar}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>{labels.calendar}</span>
          </button>

          {/* Save / Favorite — uses custom styling instead of btn-outline
              to avoid the hover:bg-primary fill that sticks on mobile touch */}
          <button
            onClick={handleSave}
            className={`inline-flex items-center justify-center gap-1 rounded-button px-button-x py-2 border-2 label font-semibold transition-colors ${
              isFavorite
                ? "border-primary bg-primary text-primary-foreground"
                : "border-primary text-primary bg-transparent"
            }`}
            aria-label={isFavorite ? labels.favoriteRemove : labels.favoriteAdd}
          >
            {isFavorite ? (
              <HeartSolid className="w-4 h-4" />
            ) : (
              <HeartOutline className="w-4 h-4" />
            )}
            <span>{labels.save}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
