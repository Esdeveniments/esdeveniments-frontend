import { getLocale, getTranslations } from "next-intl/server";
import { CulturalMessageProps } from "types/props";
import { formatCatalanA, formatPlaceName } from "@utils/helpers";
import Badge from "../badge";
import SectionHeading from "@components/ui/common/SectionHeading";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

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
    <div className="w-full">
      <div className="w-full flex flex-col gap-element-gap min-w-0">
        <SectionHeading
          Icon={MagnifyingGlassIcon}
          iconClassName="h-5 w-5 text-foreground-strong flex-shrink-0"
          title={t("explorePrefix", { location: locationText })}
          titleClassName="heading-2"
        />
        <div className="flex flex-wrap gap-2 px-section-x">
          <Badge href={`/${locationValue}/avui`}>{t("today")}</Badge>
          <Badge href={`/${locationValue}/dema`}>{t("tomorrow")}</Badge>
          <Badge href={`/${locationValue}/setmana`}>{t("week")}</Badge>
          <Badge href={`/${locationValue}/cap-de-setmana`}>{t("weekend")}</Badge>
        </div>
      </div>
    </div>
  );
};

export default CulturalMessage;
