import React from "react";
import dynamic from "next/dynamic";
import type { EventWeatherProps } from "types/event";

const Weather = dynamic(() => import("components/ui/weather"), { ssr: false });

const EventWeather: React.FC<EventWeatherProps> = ({ startDate, location }) => {
  if (!location) return null;
  return (
    <div className="w-full my-4" data-testid="event-weather">
      <Weather startDate={startDate} location={location} />
    </div>
  );
};

export default EventWeather;
