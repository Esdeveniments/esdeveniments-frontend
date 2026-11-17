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
  analyticsEventName,
  analyticsPosition,
}: CardContentServerProps) {
  const card = prepareCardContentData({
    event,
    variant: "standard",
    locale,
    tCard,
    tCategories,
    isFavorite: initialIsFavorite,
  });
  const cardWithSlot =
    analyticsPosition !== undefined ? { ...card, analyticsPosition } : card;

  return (
    <CardLayout
      card={
        variant === "row"
          ? {
              ...cardWithSlot,
              primaryLocation: buildEventVenueLabel({
                location: event.location,
                cityName: event.city?.name,
              }),
            }
          : cardWithSlot
      }
      layout={variant}
      compact={compact}
      analyticsEventName={analyticsEventName}
      position={position}
      description={description}
      isPriority={isPriority}
      headingLevel={headingLevel}
      renderLink={(props) => <CardLink {...props} locale={locale} />}
    />
  );
}

export default CardContentServer;
