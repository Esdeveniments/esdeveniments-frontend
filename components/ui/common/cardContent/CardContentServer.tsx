import CardLink from "./CardLink";
import type { CardContentServerProps } from "types/props";
import CardLayout from "./CardLayout";
import { prepareCardContentData } from "./prepareCardContentData";
import { buildEventVenueLabel } from "@utils/location-helpers";

// Sync on purpose: the list reads `labels` once (getCardLabels).
function CardContentServer({
  event,
  isPriority = false,
  initialIsFavorite,
  variant = "default",
  position,
  description,
  compact = false,
  labels: { locale, tCard, tCategories },
  headingLevel,
}: CardContentServerProps) {
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
      headingLevel={headingLevel}
      renderLink={(props) => <CardLink {...props} locale={locale} />}
    />
  );
}

export default CardContentServer;
