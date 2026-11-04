"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowTopRightOnSquareIcon,
  CalendarIcon,
  HeartIcon as HeartOutline,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import { sendGoogleEvent } from "@utils/analytics";
import useTrackedCta from "@components/hooks/useTrackedCta";
import type { EventStickyCTAProps } from "types/props";
import { useTranslations } from "next-intl";

/**
 * Returns the real FavoriteButton element on the page.
 * We look for the button with aria-label matching the favorite labels.
 */
const STICKY_BUTTON = "flex-1 gap-1 px-1.5 text-xs whitespace-nowrap";

function findFavoriteButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(
    "[data-favorite-button]"
  );
}

/**
 * Sticky CTA bar for event detail pages on mobile.
 * Sits above the bottom navigation bar using the shared mobile-nav-clearance
 * variable, including the device safe-area inset when present.
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
  const t = useTranslations("Components.EventPage");
  const [isVisible, setIsVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(() => {
    if (typeof window === "undefined") return false;
    const btn = findFavoriteButton();
    return btn?.getAttribute("aria-pressed") === "true";
  });
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { ref: ctaRef, trackClick } = useTrackedCta<HTMLDivElement>("sticky_cta");

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
    trackClick();
    sendGoogleEvent("sticky_cta_click", {
      action: "more_info",
      event_slug: eventSlug,
    });
  };

  const handleCalendar = () => {
    trackClick();
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
    trackClick();
    // Delegate to the real FavoriteButton so the cookie-based API stays in sync
    const btn = findFavoriteButton();
    if (!btn) return;
    btn.click();
    sendGoogleEvent("sticky_cta_click", {
      action: isFavorite ? "unsave" : "save",
      event_slug: eventSlug,
    });
  };

  if (!isVisible) return null;

  return (
    <div
      ref={ctaRef}
      className="fixed bottom-[var(--mobile-nav-clearance)] left-0 right-0 z-40 md:hidden"
      role="toolbar"
      aria-label={t("toolbarAriaLabel")}
    >
      <div className="bg-background/95 backdrop-blur-md border-t border-border shadow-lg">
        <div className="flex items-stretch justify-evenly gap-1 px-section-x py-2">
          {/* More info - links to external event URL */}
          {eventUrl && /^https?:\/\//i.test(eventUrl) && (
            <a
              href={eventUrl}
              target="_blank"
              rel="noreferrer"
              onClick={handleMoreInfo}
              className={`btn-primary ${STICKY_BUTTON}`}
              data-analytics-link-type="sticky_cta_more_info"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              <span>{labels.moreInfo}</span>
            </a>
          )}

          {/* Add to calendar - scrolls to calendar section */}
          <button
            onClick={handleCalendar}
            className={`btn-outline ${STICKY_BUTTON}`}
            aria-label={labels.calendar}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>{labels.calendar}</span>
          </button>

          {/* Save / Favorite — hover fill is disabled because it sticks after a tap */}
          <button
            onClick={handleSave}
            className={`${STICKY_BUTTON} ${
              isFavorite
                ? "btn-primary hover:bg-primary"
                : "btn-outline hover:bg-transparent hover:text-primary"
            }`}
            aria-label={isFavorite ? labels.favoriteRemove : labels.favoriteAdd}
            aria-pressed={isFavorite}
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
