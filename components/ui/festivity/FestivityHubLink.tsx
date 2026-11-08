import { useTranslations } from "next-intl";
import HubLink from "@components/ui/common/HubLink";
import { festivitiesForTitle, festivityPath } from "@utils/festivity";
import type { FestivityHubLinkProps } from "types/props";

/** On a fira de Nadal, pessebre vivent or cavalcada page: a link to all of them. */
export default function FestivityHubLink({ title }: FestivityHubLinkProps) {
  const t = useTranslations("Pages.Festivity");
  return festivitiesForTitle(title).map((type) => (
    <HubLink
      key={type.slug}
      href={festivityPath(type.slug)}
      label={t(`types.${type.messageKey}.eventLink`)}
      analyticsEventName="festivity_hub_click"
    />
  ));
}
