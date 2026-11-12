"use client";

import { useId, useState, type ReactNode } from "react";
import { MapIcon } from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { EventMapsProps } from "types/event";

const Maps = dynamic(() => import("components/ui/maps"), { ssr: false });

/**
 * "Com arribar" (server link, passed as children) next to the map toggle.
 * The Google Maps iframe loads only after a tap, so a page view costs nothing.
 */
export default function EventLocationClient({
  location,
  cityName,
  regionName,
  children,
}: EventMapsProps & { children?: ReactNode }) {
  const t = useTranslations("Components.EventLocation");
  const [showMap, setShowMap] = useState(false);
  const mapId = useId();

  return (
    <>
      <div className="flex flex-wrap items-center gap-element-gap-sm">
        {children}
        <button
          type="button"
          className="btn-ghost btn-sm"
          aria-expanded={showMap}
          aria-controls={mapId}
          onClick={() => setShowMap((prev) => !prev)}
        >
          <MapIcon className="h-4 w-4" aria-hidden="true" />
          {showMap ? t("hideMap") : t("showMap")}
        </button>
      </div>
      <div id={mapId} hidden={!showMap}>
        {showMap && (
          <div className="h-[400px] w-full overflow-hidden rounded-card bg-muted">
            <Maps location={location} cityName={cityName} regionName={regionName} />
          </div>
        )}
      </div>
    </>
  );
}
