import { useEffect, useRef, FC, RefObject } from "react";
import type { EventMapsProps } from "types/event";

const Maps: FC<EventMapsProps> = ({ location, cityName, regionName }) => {
  const mapRef = useRef<HTMLDivElement | null>(
    null
  ) as RefObject<HTMLDivElement>;
  const query = encodeURIComponent(`${location}, ${cityName}, ${regionName}`);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const frame = document.createElement("iframe");
    frame.src = map.getAttribute("data-src") || "";
    frame.style.width = "100%";
    frame.style.height = "400px";
    frame.style.border = "0";
    frame.allowFullscreen = true;
    map.appendChild(frame);

    return () => {
      map.removeChild(frame);
    };
  }, [mapRef]);

  return (
    <div
      className="w-full flex justify-center items-center overflow-hidden"
      data-src={`https://www.google.com/maps/embed/v1/place?q=${query}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS}`}
      id="mymap"
      ref={mapRef}
    />
  );
};

export default Maps;
