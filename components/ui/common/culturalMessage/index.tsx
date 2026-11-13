import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { CulturalMessageProps } from "types/props";
import type { AppLocale } from "types/i18n";
import { formatPlaceName } from "@utils/helpers";
import { formatPlacePreposition } from "@utils/string-helpers";
import Badge from "../badge";
import SectionHeading from "@components/ui/common/SectionHeading";

const CulturalMessage = async ({
  location,
  locationValue,
  locationType = "general",
}: CulturalMessageProps) => {
  if (!location) {
    return null;
  }

  const locale = (await rootLocale()) as AppLocale;
  const t = await getTranslations({
    locale,
    namespace: "Components.CulturalMessage",
  });
  const placeIn = formatPlacePreposition(
    formatPlaceName(location),
    locationType,
    locale,
    false
  );

  return (
    <div className="w-full flex flex-col gap-element-gap min-w-0">
        <SectionHeading
          title={t("explorePrefix", { placeIn })}
          titleClassName="heading-2"
        />
        <div className="flex flex-wrap gap-element-gap">
          <Badge href={`/${locationValue}/avui`}>{t("today")}</Badge>
          <Badge href={`/${locationValue}/dema`}>{t("tomorrow")}</Badge>
          <Badge href={`/${locationValue}/setmana`}>{t("week")}</Badge>
          <Badge href={`/${locationValue}/cap-de-setmana`}>{t("weekend")}</Badge>
        </div>
    </div>
  );
};

export default CulturalMessage;
