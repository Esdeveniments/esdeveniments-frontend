import { getTranslations } from "next-intl/server";
import { CalendarIcon, MapPinIcon as LocationMarkerIcon } from "@heroicons/react/24/outline";
import type { NewsRichCardProps } from "types/props";
import { formatCardDate } from "@utils/date-helpers";
import { stripHtmlTags } from "@utils/sanitize";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { getLocaleSafely } from "@utils/i18n-seo";
import { CATEGORY_BADGE_COLOR } from "@utils/constants";
import Image from "@components/ui/common/image";

export default async function NewsRichCard({
  event,
  variant = "default",
  numbered,
}: NewsRichCardProps) {
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.News" });
  const rawImage = event.imageUrl;
  const { cardDate: dateLabel } = formatCardDate(
    event.startDate,
    event.endDate,
    locale,
  );
  const primaryCategory =
    event.categories && event.categories.length > 0
      ? { name: event.categories[0].name, slug: event.categories[0].slug }
      : undefined;
  const plainDescription = stripHtmlTags(event.description || "");

  if (variant === "horizontal") {
    return (
      <article className="relative rounded-card overflow-hidden bg-background border border-border/20 hover:border-border/40 transition-colors duration-normal group w-full">
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 p-4 sm:p-6 relative z-[1]">
          {numbered && (
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-background">
                {numbered}
              </div>
            </div>
          )}

          <div className="md:flex-shrink-0">
            <div className="aspect-[4/3] w-full md:w-48 rounded-lg overflow-hidden bg-muted">
              <Image
                className="w-full h-full object-cover transition-transform group-hover:scale-[1.03]"
                title={event.title}
                image={rawImage}
                alt={event.title}
                context="list"
                cacheKey={event.hash}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold tracking-normal leading-snug mb-3 text-foreground-strong group-hover:text-primary/85 transition-colors">
              <PressableAnchor
                href={`/e/${event.slug}`}
                prefetch={false}
                className="focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
                aria-label={event.title}
                variant="inline"
              >
                {event.title}
              </PressableAnchor>
            </h3>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              {primaryCategory && (
                <PressableAnchor
                  href={`/catalunya/${primaryCategory.slug}`}
                  prefetch={false}
                  className={`inline-block text-[11px] font-semibold rounded-badge px-2 py-0.5 ${CATEGORY_BADGE_COLOR}`}
                  aria-label={t("viewCategory", { name: primaryCategory.name })}
                  variant="inline"
                >
                  {primaryCategory.name}
                </PressableAnchor>
              )}
              <span className="badge-default inline-flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                {dateLabel}
              </span>
              {event.location && (
                <span className="badge-default inline-flex items-center gap-1.5">
                  <LocationMarkerIcon className="w-4 h-4 flex-shrink-0" />
                  {event.location}
                </span>
              )}
            </div>

            {plainDescription && (
              <p className="text-xs sm:text-sm font-normal leading-relaxed tracking-normal mb-4 text-foreground-strong/70 line-clamp-3">
                {plainDescription}
              </p>
            )}

            <div className="flex items-center justify-between">
              <PressableAnchor
                href={`/e/${event.slug}`}
                prefetch={false}
                className="text-xs sm:text-sm font-semibold text-primary hover:text-primary/85 transition-colors"
                aria-label={t("readMoreAria", { title: event.title })}
                variant="inline"
              >
                {t("readMore")}
              </PressableAnchor>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="relative rounded-card overflow-hidden bg-background border border-border/20 hover:border-border/40 transition-colors duration-normal group w-full">
      <div className="relative aspect-[3/2] overflow-hidden bg-muted">
        <Image
          className="w-full h-full object-cover transition-transform group-hover:scale-[1.03]"
          title={event.title}
          image={rawImage}
          alt={event.title}
          context="card"
          cacheKey={event.hash}
        />
      </div>

      <div className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold tracking-normal leading-snug mb-4 text-foreground-strong group-hover:text-primary/85 transition-colors">
          <PressableAnchor
            href={`/e/${event.slug}`}
            prefetch={false}
            className="focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
            aria-label={event.title}
            variant="inline"
          >
            {event.title}
          </PressableAnchor>
        </h3>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {primaryCategory && (
            <PressableAnchor
              href={`/catalunya/${primaryCategory.slug}`}
              prefetch={false}
              className={`inline-block text-[11px] font-semibold rounded-badge px-2 py-0.5 ${CATEGORY_BADGE_COLOR}`}
              aria-label={t("viewCategory", { name: primaryCategory.name })}
              variant="inline"
            >
              {primaryCategory.name}
            </PressableAnchor>
          )}
          <span className="badge-default inline-flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4 flex-shrink-0" />
            {dateLabel}
          </span>
          {event.location && (
            <span className="badge-default inline-flex items-center gap-1.5">
              <LocationMarkerIcon className="w-4 h-4 flex-shrink-0" />
              {event.location}
            </span>
          )}
        </div>

        {plainDescription && (
          <p className="text-xs sm:text-sm font-normal leading-relaxed tracking-normal mb-5 text-foreground-strong/70 line-clamp-3">
            {plainDescription}
          </p>
        )}

        <div className="flex items-center justify-between">
          <PressableAnchor
            href={`/e/${event.slug}`}
            prefetch={false}
            className="text-xs sm:text-sm font-semibold text-primary hover:text-primary/85 transition-colors"
            aria-label={t("readMoreAria", { title: event.title })}
            variant="inline"
          >
            {t("readMore")}
          </PressableAnchor>
        </div>
      </div>
    </article>
  );
}
