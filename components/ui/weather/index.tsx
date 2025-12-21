import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { EventWeatherProps } from "types/event";

export default async function Weather({ weather }: EventWeatherProps) {
  const t = await getTranslations("Components.Weather");
  if (
    !weather ||
    !weather.temperature ||
    !weather.description ||
    !weather.icon
  ) {
    return <p>{t("noData")}</p>;
  }

  const { temperature, description, icon } = weather;
  const temp = Math.floor(Number(temperature));

  return (
    <div className="flex justify-start items-center gap-2">
      <div className="flex justify-center items-center">
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
      <div className="flex justify-center items-center gap-2">
        <p className="">{description}</p>
        <p className="">- {temp}º</p>
      </div>
    </div>
  );
}
