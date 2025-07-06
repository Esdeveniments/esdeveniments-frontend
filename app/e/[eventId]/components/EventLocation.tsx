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

const Maps = dynamic(() => import("components/ui/maps"), { ssr: false });

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
      "_blank"
    );
  };

  // Check if location already contains city information to avoid duplication
  const locationContainsCity = location
    .toLowerCase()
    .includes(cityName.toLowerCase());
  const shouldShowCityRegion = !locationContainsCity && cityName && regionName;

  return (
    <>
      <div className="w-full flex justify-center items-start gap-2 px-4">
        <LocationIcon className="h-5 w-5 mt-1" aria-hidden="true" />
        <div className="w-11/12 flex flex-col gap-4 pr-4">
          <h2>Ubicació</h2>
          <div className="w-full flex flex-col justify-center items-center gap-4">
            <div className="w-full flex flex-col justify-center items-start gap-4">
              <div className="w-full flex flex-col justify-start items-start gap-1">
                <p>{location}</p>
                {shouldShowCityRegion && (
                  <p>
                    {cityName}, {regionName}
                  </p>
                )}
              </div>
              <div
                className="w-fit flex justify-start items-center gap-2 border-b-2 border-whiteCorp hover:border-b-2 hover:border-blackCorp ease-in-out duration-300 cursor-pointer"
                onClick={handleShowMap}
              >
                <button type="button" className="flex gap-2">
                  <p className="font-medium">Mostrar mapa</p>
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
          className="w-full flex flex-col justify-center items-end gap-6"
          ref={mapsDivRef}
        >
          {isMapsVisible && <Maps location={location} />}
          <div className="w-fit flex justify-end items-center gap-2 px-4 border-b-2 border-whiteCorp hover:border-b-2 hover:border-blackCorp ease-in-out duration-300 cursor-pointer">
            <button className="flex gap-2" onClick={handleDirectionsClick}>
              <p className="font-medium">Com arribar</p>
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
