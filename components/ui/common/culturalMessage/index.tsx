import { getLocale, getTranslations } from "next-intl/server";
import { CulturalMessageProps } from "types/props";
import { formatCatalanA, formatPlaceName } from "@utils/helpers";
import Badge from "../badge";

const CulturalMessage = async ({
  location,
  locationValue,
  locationType = "general",
}: CulturalMessageProps) => {
  if (!location) {
    return null;
  }

  const t = await getTranslations("Components.CulturalMessage");
  const locale = await getLocale();
  const capitalizedLocation = formatPlaceName(location);
  const locationText =
    locale === "ca"
      ? formatCatalanA(capitalizedLocation, locationType, false)
      : capitalizedLocation;

  return (
    <div className="leading-relaxed flex flex-col gap-element-gap">
      <p className="text-base leading-relaxed text-foreground-strong font-bold ">
        {t("explorePrefix", { location: locationText })}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Badge href={`/${locationValue}/avui`}>{t("today")}</Badge>
        <Badge href={`/${locationValue}/dema`}>{t("tomorrow")}</Badge>
        <Badge href={`/${locationValue}/setmana`}>{t("week")}</Badge>
        <Badge href={`/${locationValue}/cap-de-setmana`}>{t("weekend")}</Badge>
      </div>
    </div>
  );
};

export default CulturalMessage;
