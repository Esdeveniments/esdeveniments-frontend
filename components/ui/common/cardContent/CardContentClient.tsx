"use client";
import CardLinkClient from "./CardLinkClient";
import { CardContentProps } from "types/props";
import { useTranslations, useLocale } from "next-intl";
import { DEFAULT_LOCALE, type AppLocale } from "types/i18n";
import CardLayout from "./CardLayout";
import { prepareCardContentData } from "./prepareCardContentData";

export default function CardContentClient({
  event,
  isPriority = false,
  initialIsFavorite = false,
}: CardContentProps) {
  const tCard = useTranslations("Components.CardContent");
  const tTime = useTranslations("Utils.EventTime");
  const locale = (useLocale() || DEFAULT_LOCALE) as AppLocale;
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
    priceLabel,
    urgencyLabel,
    urgencyType,
    multiDayLabel,
  } = prepareCardContentData({
    event,
    variant: "standard",
    locale,
    tCard,
    tTime,
  });

  return (
    <CardLayout
      slug={event.slug}
      eventId={event.id ? String(event.id) : undefined}
      title={title}
      originalTitle={event.title}
      image={image}
      isPriority={isPriority}
      cardDate={cardDate}
      timeDisplay={timeDisplay}
      primaryLocation={primaryLocation}
      categoryLabel={categoryLabel}
      categorySlug={categorySlug}
      priceLabel={priceLabel}
      urgencyLabel={urgencyLabel}
      urgencyType={urgencyType}
      multiDayLabel={multiDayLabel}
      shouldShowFavoriteButton={shouldShowFavoriteButton}
      isFavorite={initialIsFavorite}
      favoriteLabels={favoriteLabels}
      imageContext={{
        location: event.city?.name || event.location,
        region: event.region?.name || event.city?.name,
        date: cardDate,
      }}
      imageCacheKey={event.hash || event.updatedAt}
      imageViewTransitionName={`event-image-${event.id}`}
      renderLink={(props) => <CardLinkClient {...props} />}
    />
  );
}
