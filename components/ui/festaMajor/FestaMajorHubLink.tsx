import { useLocale, useTranslations } from "next-intl";
import HubLink from "@components/ui/common/HubLink";
import { festaMajorPath } from "@utils/festa-major-paths";
import { formatPlacePhrases } from "@utils/string-helpers";
import type { AppLocale } from "types/i18n";
import type { FestaMajorHubLinkProps } from "types/props";

/** On a festa major act's page: a link to its town's whole programme. */
export default function FestaMajorHubLink({
  citySlug,
  cityName,
}: FestaMajorHubLinkProps) {
  const t = useTranslations("Components.FestaMajorLink");
  const locale = useLocale() as AppLocale;
  const { placeOf } = formatPlacePhrases(cityName, "town", locale);
  return (
    <HubLink
      href={festaMajorPath(citySlug)}
      label={t("label", { placeOf })}
      analyticsEventName="festa_major_hub_click"
    />
  );
}
