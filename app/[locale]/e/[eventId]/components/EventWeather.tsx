import { getTranslations } from "next-intl/server";
import type { EventWeatherProps } from "types/event";
import SectionHeading from "@components/ui/common/SectionHeading";
import Weather from "components/ui/weather";

// Converted to server component for better performance
// Uses getTranslations instead of useTranslations to enable SSR
async function EventWeather({ weather }: EventWeatherProps) {
  const t = await getTranslations("Components.Weather");

  if (!weather) return null;

  return (
    <div className="w-full" data-testid="event-weather">
      <div className="w-full flex flex-col gap-element-gap min-w-0">
        <SectionHeading
          title={t("title")}
          titleClassName="heading-2"
        />
        <Weather weather={weather} />
      </div>
    </div>
  );
}

export default EventWeather;
