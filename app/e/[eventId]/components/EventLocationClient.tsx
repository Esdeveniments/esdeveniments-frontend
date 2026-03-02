"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  XMarkIcon as XIcon,
  ChevronDownIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { EventLocationProps } from "types/event";
import { sendGoogleEvent } from "@utils/analytics";

const Maps = dynamic(() => import("components/ui/maps"), { ssr: false });

export default function EventLocationClient({
  location,
  cityName,
  regionName,
  compact = false,
}: Pick<EventLocationProps, "location" | "cityName" | "regionName" | "compact">) {
  const t = useTranslations("Components.EventLocation");
  const tPage = useTranslations("Components.EventPage");
  const [showMap, setShowMap] = useState(compact); // Auto-show in compact mode
  const [isMapsVisible, setIsMapsVisible] = useState(false);
  const [hasAutoExpanded, setHasAutoExpanded] = useState(compact);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  // Auto-expand map when the location section scrolls into view.
  // Uses the free Maps Embed API (no usage limits / cost).
  // The iframe only loads once visible, so no impact on initial page load.
  useEffect(() => {
    if (hasAutoExpanded) return;
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShowMap(true);
          setHasAutoExpanded(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAutoExpanded]);

  const handleShowMap = useCallback(() => {
    setShowMap((prev) => {
      const next = !prev;
      if (!next) {
        setIsMapsVisible(false);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (showMap) {
      const timeoutId = window.setTimeout(() => setIsMapsVisible(true), 100);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [showMap]);

  const handleDirectionsClick = () => {
    const query = encodeURIComponent(`${location}, ${cityName}, ${regionName}`);

    sendGoogleEvent("outbound_click", {
      link_domain: "www.google.com",
      link_path: "/maps/search/",
      link_type: "maps_directions",
      context: "event_location",
    });

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      "_blank"
    );
  };

  const handleOpenInMaps = () => {
    const query = encodeURIComponent(`${location}, ${cityName}, ${regionName}`);

    sendGoogleEvent("outbound_click", {
      link_domain: "www.google.com",
      link_path: "/maps/search/",
      link_type: "maps_open",
      context: "event_location",
    });

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      "_blank"
    );
  };

  // Compact mode: auto-show map, no toggle, just map + "Open in Maps" link
  if (compact) {
    return (
      <div ref={sectionRef} className="w-full flex flex-col gap-2">
        {isMapsVisible && (
          <div className="w-full rounded-card overflow-hidden">
            <Maps location={location} />
          </div>
        )}
        <button
          onClick={handleOpenInMaps}
          className="inline-flex items-center gap-1 body-small font-semibold text-primary hover:text-primary-dark transition-colors"
          type="button"
        >
          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          {tPage("sidebarOpenInMaps")}
        </button>
      </div>
    );
  }

  return (
    <div ref={sectionRef}>
      <div
        className="w-fit flex justify-start items-center gap-element-gap border-b-2 border-background hover:border-foreground-strong transition-interactive cursor-pointer"
        onClick={handleShowMap}
      >
        <button type="button" className="flex-start gap-element-gap">
          <p className="body-normal font-medium">{t("showMap")}</p>
          {showMap ? (
            <XIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
      {showMap && (
        <div className="w-full flex flex-col justify-center items-end gap-card-padding">
          {isMapsVisible && <Maps location={location} />}
          <div className="w-fit flex justify-end items-center gap-element-gap-sm px-section-x border-b-2 border-background hover:border-b-2 hover:border-foreground-strong ease-in-out duration-300 cursor-pointer">
            <button
              className="flex gap-element-gap-sm"
              onClick={handleDirectionsClick}
            >
              <p className="body-normal font-medium">{t("getDirections")}</p>
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
