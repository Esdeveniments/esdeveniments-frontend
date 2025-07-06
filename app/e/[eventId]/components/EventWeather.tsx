import React from "react";
import dynamic from "next/dynamic";
import { CloudIcon } from "@heroicons/react/outline";
import type { EventWeatherProps } from "types/event";

const Weather = dynamic(() => import("components/ui/weather"), { ssr: false });

const EventWeather: React.FC<EventWeatherProps> = ({ weather }) => {
  if (!weather) return null;

  return (
    <div
      className="w-full flex justify-center items-start gap-2 px-4"
      data-testid="event-weather"
    >
      <CloudIcon className="w-5 h-5 mt-1" />
      <div className="w-11/12 flex flex-col gap-4">
        <h2>El temps</h2>
        <Weather weather={weather} />
      </div>
    </div>
  );
};

export default EventWeather;
