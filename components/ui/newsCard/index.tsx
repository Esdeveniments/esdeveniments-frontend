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
  headingLevel,
}: NewsCardProps) {
  const locale = await getLocaleSafely();
  const { cardDate } = formatCardDate(event.startDate, event.endDate, locale);

  return (
    <CardLayout
      card={{
        slug: event.slug,
        eventId: event.id,
        title: event.title,
        image: event.imageUrl,
        cardDate,
        timeDisplay: "",
        primaryLocation: placeLabel ?? "",
        imageContext: { location: placeLabel, date: cardDate },
        imageCacheKey: event.updatedAt,
      }}
      href={`/noticies/${placeSlug}/${event.slug}`}
      analyticsEventName="select_news"
      layout={variant}
      description={
        variant === "featured"
          ? stripHtmlTags(event.description || "")
          : undefined
      }
      isPriority={priority}
      headingLevel={headingLevel}
      renderLink={(props) => <CardLink {...props} />}
    />
  );
}
