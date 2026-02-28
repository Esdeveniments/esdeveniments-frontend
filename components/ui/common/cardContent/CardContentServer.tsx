import CardLink from "./CardLink";
import ViewCounter from "@components/ui/viewCounter";
import { CardContentProps } from "types/props";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely } from "@utils/i18n-seo";
import CardLayout from "./CardLayout";
import { prepareCardContentData } from "./prepareCardContentData";

async function CardContentServer({
  event,
  isPriority = false,
  initialIsFavorite,
}: CardContentProps) {
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
      eventId={event.id ? String(event.id) : undefined}
      title={title}
      originalTitle={event.title}
      image={image}
      isPriority={isPriority}
      cardDate={cardDate}
      timeDisplay={timeDisplay}
      primaryLocation={primaryLocation}
      categoryLabel={categoryLabel}
      shouldShowFavoriteButton={shouldShowFavoriteButton}
      isFavorite={isFavorite}
      favoriteLabels={favoriteLabels}
      visits={event.visits}
      imageContext={{
        location: event.city?.name || event.location,
        region: event.region?.name || event.city?.name,
        date: cardDate,
      }}
      imageCacheKey={event.hash || event.updatedAt}
      renderLink={(props) => <CardLink {...props} />}
      renderCounter={(visits) => <ViewCounter visits={visits} hideText />}
    />
  );
}

export default CardContentServer;
