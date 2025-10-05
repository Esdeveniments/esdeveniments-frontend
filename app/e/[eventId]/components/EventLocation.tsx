"use client";
import { useState, useRef } from "react";
import {
  LocationMarkerIcon as LocationIcon,
  XIcon,
  ChevronDownIcon,
  ArrowRightIcon,
} from "@heroicons/react/outline";
import dynamic from "next/dynamic";
import { EventLocationProps } from "types/event";
import { Text } from "components/ui/primitives/Text";

const Maps = dynamic(() => import("components/ui/domain/maps"), { ssr: false });

export default function EventLocation({
  location,
  cityName,
  regionName,
}: EventLocationProps) {
  const [showMap, setShowMap] = useState(false);
  const [isMapsVisible, setIsMapsVisible] = useState(false);
  const mapsDivRef = useRef(null);

  const handleShowMap = () => {
    setShowMap((prev) => !prev);
    setTimeout(() => setIsMapsVisible(true), 100); // Optional: delay for smoothness
  };

  const handleDirectionsClick = () => {
    const query = encodeURIComponent(`${location}, ${cityName}, ${regionName}`);
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      "_blank",
    );
  };

  // Check if location already contains city information to avoid duplication
  const locationContainsCity = location
    .toLowerCase()
    .includes(cityName.toLowerCase());
  const shouldShowCityRegion = !locationContainsCity && cityName && regionName;

  return (
    <>
      <div className="flex w-full items-start justify-center gap-component-xs px-component-md">
        <LocationIcon className="mt-component-xs h-5 w-5" aria-hidden="true" />
        <div className="flex w-11/12 flex-col gap-component-md pr-component-md">
          <Text as="h2" variant="h2">
            Ubicació
          </Text>
          <div className="flex w-full flex-col items-center justify-center gap-component-md">
            <div className="flex w-full flex-col items-start justify-center gap-component-md">
              <div className="gap-xs flex w-full flex-col items-start justify-start">
                <Text variant="body">{location}</Text>
                {shouldShowCityRegion && (
                  <Text variant="body">
                    {cityName}, {regionName}
                  </Text>
                )}
              </div>
              <div
                className="flex w-fit cursor-pointer items-center justify-start gap-component-xs border-b-2 border-whiteCorp duration-300 ease-in-out hover:border-b-2 hover:border-blackCorp"
                onClick={handleShowMap}
              >
                <button type="button" className="flex gap-component-xs">
                  <Text variant="body" className="font-medium">
                    Mostrar mapa
                  </Text>
                  {showMap ? (
                    <XIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showMap && (
        <div
          className="flex w-full flex-col items-end justify-center gap-component-lg"
          ref={mapsDivRef}
        >
          {isMapsVisible && <Maps location={location} />}
          <div className="flex w-fit cursor-pointer items-center justify-end gap-component-xs border-b-2 border-whiteCorp px-component-md duration-300 ease-in-out hover:border-b-2 hover:border-blackCorp">
            <button
              className="flex gap-component-xs"
              onClick={handleDirectionsClick}
            >
              <Text variant="body" className="font-medium">
                Com arribar
              </Text>
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
