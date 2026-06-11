"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  XMarkIcon as XIcon,
  ChevronDownIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  MapIcon,
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
  // Click-to-load: never auto-show. User must explicitly request the embed
  // to avoid loading the Google Maps iframe on every detail-page view.
  const [showMap, setShowMap] = useState(false);
  const [isMapsVisible, setIsMapsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);

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

  const openGoogleMaps = (linkType: "maps_directions" | "maps_open") => {
    const query = encodeURIComponent(`${location}, ${cityName}, ${regionName}`);

    sendGoogleEvent("outbound_click", {
      link_domain: "www.google.com",
      link_path: "/maps/search/",
      link_type: linkType,
      context: "event_location",
    });

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleDirectionsClick = () => openGoogleMaps("maps_directions");
  const handleOpenInMaps = () => openGoogleMaps("maps_open");

  // Compact mode: click-to-load placeholder, then map + "Open in Maps" link
  if (compact) {
    return (
      <div ref={sectionRef} className="w-full flex flex-col gap-2">
        <div className="w-full h-[400px] rounded-card overflow-hidden bg-muted">
          {showMap ? (
            isMapsVisible && <Maps location={location} cityName={cityName} regionName={regionName} />
          ) : (
            <button
              type="button"
              onClick={handleShowMap}
              className="w-full h-full flex flex-col items-center justify-center gap-2 text-foreground/80 hover:text-foreground-strong hover:bg-muted/80 transition-colors"
              aria-label={t("showMap")}
            >
              <MapIcon className="h-8 w-8" aria-hidden="true" />
              <span className="body-small font-medium">{t("showMap")}</span>
            </button>
          )}
        </div>
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
          <p className="body-normal font-medium">{showMap ? t("hideMap") : t("showMap")}</p>
          {showMap ? (
            <XIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
      {showMap && (
        <div className="w-full flex flex-col justify-center items-end gap-card-padding">
          <div className="w-full h-[400px] bg-muted">
            {isMapsVisible && <Maps location={location} cityName={cityName} regionName={regionName} />}
          </div>
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
