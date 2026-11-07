import CardLink from "./CardLink";
import type { CardContentServerProps } from "types/props";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import CardLayout from "./CardLayout";
import { prepareCardContentData } from "./prepareCardContentData";
import { buildEventVenueLabel } from "@utils/location-helpers";

async function CardContentServer({
  event,
  isPriority = false,
  initialIsFavorite,
  variant = "default",
  position,
  description,
  compact = false,
  locale: localeProp,
}: CardContentServerProps) {
  // Callers that already hold rootLocale() pass it, so they don't start reading headers().
  const locale = localeProp ?? (await getLocaleSafely());
  const tCard = await getTranslations({ locale, namespace: "Components.CardContent" });
  const tCategories = await getTranslations({ locale, namespace: "Config.Categories" });
  const card = prepareCardContentData({
    event,
    variant: "standard",
    locale,
    tCard,
    tCategories,
    isFavorite: initialIsFavorite,
  });

  return (
    <CardLayout
      card={
        variant === "row"
          ? {
              ...card,
              primaryLocation: buildEventVenueLabel({
                location: event.location,
                cityName: event.city?.name,
              }),
            }
          : card
      }
      layout={variant}
      compact={compact}
      position={position}
      description={description}
      isPriority={isPriority}
      renderLink={(props) => <CardLink {...props} />}
    />
  );
}

export default CardContentServer;
