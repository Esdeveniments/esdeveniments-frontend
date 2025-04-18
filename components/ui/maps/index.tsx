import { useEffect, useRef, FC, RefObject } from "react";

interface MapsProps {
  location: string;
}

const Maps: FC<MapsProps> = ({ location }) => {
  const mapRef = useRef<HTMLDivElement | null>(
    null
  ) as RefObject<HTMLDivElement>;

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const frame = document.createElement("iframe");
    frame.src = map.getAttribute("data-src") || "";
    frame.style.width = "100%";
    frame.style.height = "400px";
    frame.style.border = "0";
    frame.allowFullscreen = true;

    const onLoad = () => {
      frame.removeEventListener("load", onLoad);
    };
    frame.addEventListener("load", onLoad);
    map.appendChild(frame);

    return () => {
      map.removeChild(frame);
    };
  }, [mapRef]);

  return (
    <div
      className="w-full flex justify-center items-center overflow-hidden"
      data-src={`https://www.google.com/maps/embed/v1/place?q=${location}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS}`}
      id="mymap"
      ref={mapRef}
    />
  );
};

export default Maps;
