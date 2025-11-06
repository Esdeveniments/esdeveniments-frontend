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
import SectionHeading from "@components/ui/common/SectionHeading";

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
      <div className="w-full">
        <div className="w-full flex flex-col gap-element-gap pr-section-x min-w-0">
          <SectionHeading
            Icon={LocationIcon}
            iconClassName="h-5 w-5 text-foreground-strong flex-shrink-0"
            title="Ubicació"
            titleClassName="heading-2"
          />
          <div className="w-full flex flex-col justify-center items-center gap-element-gap px-section-x">
            <div className="w-full flex flex-col justify-center items-start gap-element-gap">
              <div className="w-full flex flex-col justify-start items-start gap-1">
                <p className="body-normal text-foreground-strong">{location}</p>
                {shouldShowCityRegion && (
                  <p className="body-normal text-foreground-strong">
                    {cityName}, {regionName}
                  </p>
                )}
              </div>
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
            </div>
          </div>
        </div>
      </div>
      {showMap && (
        <div
          className="w-full flex flex-col justify-center items-end gap-card-padding"
          ref={mapsDivRef}
        >
          {isMapsVisible && <Maps location={location} />}
          <div className="w-fit flex justify-end items-center gap-element-gap-sm px-section-x border-b-2 border-background hover:border-b-2 hover:border-foreground-strong ease-in-out duration-300 cursor-pointer">
            <button className="flex gap-element-gap-sm" onClick={handleDirectionsClick}>
              <p className="body-normal font-medium">Com arribar</p>
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
