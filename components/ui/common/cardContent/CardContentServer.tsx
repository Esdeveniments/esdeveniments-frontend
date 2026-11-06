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
}: CardContentServerProps) {
  const locale = await getLocaleSafely();
  const tCard = await getTranslations({ locale, namespace: "Components.CardContent" });
  const tTime = await getTranslations({ locale, namespace: "Utils.EventTime" });
  const tCategories = await getTranslations({ locale, namespace: "Config.Categories" });
  const {
    title,
    primaryLocation,
    image,
    cardDate,
    timeDisplay,
    favoriteLabels,
    shouldShowFavoriteButton,
    categoryLabel,
    categorySlug,
    promotedLabel,
    urgencyLabel,
    urgencyType,
    multiDayLabel,
  } = prepareCardContentData({
    event,
    variant: "standard",
    locale,
    tCard,
    tTime,
    tCategories,
  });

  const isFavorite = Boolean(event.slug && initialIsFavorite);

  return (
    <CardLayout
      slug={event.slug}
      variant={variant}
      position={position}
      description={description}
      eventId={event.id ? String(event.id) : undefined}
      title={title}
      originalTitle={event.title}
      image={image}
      isPriority={isPriority}
      cardDate={cardDate}
      timeDisplay={timeDisplay}
      primaryLocation={
        variant === "row"
          ? buildEventVenueLabel({ location: event.location, cityName: event.city?.name })
          : primaryLocation
      }
      categoryLabel={categoryLabel}
      categorySlug={categorySlug}
      promotedLabel={promotedLabel}
      urgencyLabel={urgencyLabel}
      urgencyType={urgencyType}
      multiDayLabel={multiDayLabel}
      shouldShowFavoriteButton={shouldShowFavoriteButton}
      isFavorite={isFavorite}
      favoriteLabels={favoriteLabels}
      imageContext={{
        location: event.city?.name || event.location,
        region: event.region?.name || event.city?.name,
        date: cardDate,
      }}
      imageCacheKey={event.hash || event.updatedAt}
      renderLink={(props) => <CardLink {...props} />}
    />
  );
}

export default CardContentServer;
