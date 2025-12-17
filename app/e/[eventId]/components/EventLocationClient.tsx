"use client";

import { useEffect, useState, useRef } from "react";
import {
  XIcon,
  ChevronDownIcon,
  ArrowRightIcon,
} from "@heroicons/react/outline";
import dynamic from "next/dynamic";
import type { EventLocationProps } from "types/event";
import { sendGoogleEvent } from "@utils/analytics";

const Maps = dynamic(() => import("components/ui/maps"), { ssr: false });

export default function EventLocationClient({
  location,
  cityName,
  regionName,
}: Pick<EventLocationProps, "location" | "cityName" | "regionName">) {
  const [showMap, setShowMap] = useState(false);
  const [isMapsVisible, setIsMapsVisible] = useState(false);
  const mapsDivRef = useRef<HTMLDivElement | null>(null);

  const handleShowMap = () => {
    setShowMap((prev) => {
      const next = !prev;
      if (!next) {
        setIsMapsVisible(false);
      }
      return next;
    });
  };

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

  return (
    <>
      <div
        className="w-fit flex justify-start items-center gap-element-gap border-b-2 border-background hover:border-foreground-strong transition-interactive cursor-pointer"
        onClick={handleShowMap}
      >
        <button type="button" className="flex-start gap-element-gap">
          <p className="body-normal font-medium">Mostrar mapa</p>
          {showMap ? (
            <XIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
      {showMap && (
        <div
          className="w-full flex flex-col justify-center items-end gap-card-padding"
          ref={mapsDivRef}
        >
          {isMapsVisible && <Maps location={location} />}
          <div className="w-fit flex justify-end items-center gap-element-gap-sm px-section-x border-b-2 border-background hover:border-b-2 hover:border-foreground-strong ease-in-out duration-300 cursor-pointer">
            <button
              className="flex gap-element-gap-sm"
              onClick={handleDirectionsClick}
            >
              <p className="body-normal font-medium">Com arribar</p>
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
