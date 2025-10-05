import React from "react";
import { CloudIcon } from "@heroicons/react/outline";
import { Text } from "components/ui/primitives/Text";
import Weather from "components/ui/domain/weather";
import type { EventWeatherProps } from "types/event";

const EventWeather: React.FC<EventWeatherProps> = ({ weather }) => {
  if (!weather) return null;

  return (
    <div
      className="flex w-full items-start justify-center gap-component-xs px-component-md"
      data-testid="event-weather"
    >
      <CloudIcon className="mt-component-xs h-5 w-5" />
      <div className="flex w-11/12 flex-col gap-component-md">
        <Text as="h2" variant="h2">
          El temps
        </Text>
        <Weather weather={weather} />
      </div>
    </div>
  );
};

export default EventWeather;
