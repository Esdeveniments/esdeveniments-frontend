import React from "react";
import { CloudIcon } from "@heroicons/react/outline";
import type { EventWeatherProps } from "types/event";
import SectionHeading from "@components/ui/common/SectionHeading";
import Weather from "components/ui/weather";

const EventWeather: React.FC<EventWeatherProps> = ({ weather }) => {
  if (!weather) return null;

  return (
    <div className="w-full" data-testid="event-weather">
      <div className="w-full flex flex-col gap-element-gap min-w-0">
        <SectionHeading
          Icon={CloudIcon}
          iconClassName="h-5 w-5 text-foreground-strong flex-shrink-0"
          title="El temps"
          titleClassName="heading-2"
        />
        <Weather weather={weather} />
      </div>
    </div>
  );
};

export default EventWeather;
