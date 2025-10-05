import { memo, FC } from "react";
import Image from "next/image";
import { Text } from "@components/ui/primitives";
import type { EventWeatherProps } from "types/event";

const Weather: FC<EventWeatherProps> = ({ weather }) => {
  if (
    !weather ||
    !weather.temperature ||
    !weather.description ||
    !weather.icon
  ) {
    return (
      <Text variant="body-sm">No hi ha dades meteorològiques disponibles.</Text>
    );
  }

  const { temperature, description, icon } = weather;
  const temp = Math.floor(Number(temperature));

  return (
    <div className="flex items-center justify-start gap-component-xs">
      <div className="flex items-center justify-center">
        <Image
          alt={description || "Weather icon"}
          src={`/static/images/icons/${icon}.png`}
          width={27}
          height={27}
          style={{
            maxWidth: "100%",
            height: "auto",
          }}
        />
      </div>
      <div className="flex items-center justify-center gap-component-xs">
        <Text variant="body-sm">{description}</Text>
        <Text variant="h1">- {temp}º</Text>
      </div>
    </div>
  );
};

Weather.displayName = "Weather";

export default memo(Weather);
