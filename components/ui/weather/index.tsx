/* eslint-disable */
// Check in the future
import { memo, FC } from "react";
import Image from "next/image";
import { getFormattedDate } from "@utils/helpers";
import type { EventWeatherProps } from "types/event";

interface FormattedDateResult {
  isLessThanFiveDays: boolean;
  startDate: string | Date;
  isMultipleDays: boolean;
}

interface WeatherData {
  temp?: number;
  description?: string;
  icon?: string;
}

const Weather: FC<EventWeatherProps> = ({ startDate, location }) => {
  const {
    isLessThanFiveDays,
    startDate: start,
    isMultipleDays,
  }: FormattedDateResult = getFormattedDate(startDate);

  const showWeather = isMultipleDays || isLessThanFiveDays;
  console.log(showWeather);
  console.log(start);
  console.log(location);
  const { data, error } = { data: undefined, error: undefined }; // useGetWeather(showWeather, location);

  if (!data || error) return <p>No hi ha dades meteorològiques disponibles.</p>;

  const weather: WeatherData = {}; // normalizeWeather(start, data);
  const { temp, description: weatherDescription, icon } = weather || {};

  return (
    <div className="flex justify-start items-center gap-2">
      {icon && (
        <div className="flex justify-center items-center">
          <Image
            alt={weatherDescription || "Weather icon"}
            src={icon}
            width={27}
            height={27}
            style={{
              maxWidth: "100%",
              height: "auto",
            }}
          />
        </div>
      )}{" "}
      <div className="flex justify-center items-center gap-2">
        <p className="">{weatherDescription ? weatherDescription : ""} </p>
        <p className="">{temp ? `- ${temp}º` : ""}</p>
      </div>
    </div>
  );
};

Weather.displayName = "Weather";

export default memo(Weather);
