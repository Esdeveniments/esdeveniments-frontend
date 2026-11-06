import type { NewsCardProps } from "types/props";
import { formatCardDate } from "@utils/date-helpers";
import { stripHtmlTags } from "@utils/sanitize";
import { getLocaleSafely } from "@utils/i18n-seo";
import CardLayout from "@components/ui/common/cardContent/CardLayout";
import CardLink from "@components/ui/common/cardContent/CardLink";

// News share the event card layout so both lists look the same.
export default async function NewsCard({
  event,
  placeSlug,
  placeLabel,
  variant = "default",
  priority = false,
}: NewsCardProps) {
  const locale = await getLocaleSafely();
  const { cardDate } = formatCardDate(event.startDate, event.endDate, locale);

  return (
    <CardLayout
      slug={event.slug}
      href={`/noticies/${placeSlug}/${event.slug}`}
      analyticsEventName="select_news"
      variant={variant}
      description={
        variant === "featured"
          ? stripHtmlTags(event.description || "")
          : undefined
      }
      eventId={event.id}
      title={event.title}
      originalTitle={event.title}
      image={event.imageUrl}
      isPriority={priority}
      cardDate={cardDate}
      timeDisplay=""
      primaryLocation={placeLabel ?? ""}
      imageContext={{ location: placeLabel, date: cardDate }}
      imageCacheKey={event.updatedAt}
      renderLink={(props) => <CardLink {...props} />}
    />
  );
}
