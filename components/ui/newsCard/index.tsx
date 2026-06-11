import { getTranslations } from "next-intl/server";
import type { NewsCardProps } from "types/props";
import { formatCardDate } from "@utils/date-helpers";
import { stripHtmlTags } from "@utils/sanitize";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { getLocaleSafely, withLocalePath } from "@utils/i18n-seo";
import { CalendarIcon, MapPinIcon as LocationMarkerIcon } from "@heroicons/react/24/outline";
import Image from "@components/ui/common/image";

export default async function NewsCard({
  event,
  placeSlug,
  placeLabel,
  variant = "default",
}: NewsCardProps) {
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.News" });
  const rawImage = event.imageUrl;
  const { cardDate: dateLabel } = formatCardDate(
    event.startDate,
    event.endDate,
    locale,
  );
  const href = withLocalePath(`/noticies/${placeSlug}/${event.slug}`, locale);
  const plainDescription = stripHtmlTags(event.description || "");

  if (variant === "hero") {
    return (
      <PressableAnchor
        href={href}
        prefetch={false}
        variant="card"
        className="relative w-full overflow-hidden rounded-xl bg-foreground-strong shadow-lg block"
        aria-label={event.title}
      >
        <section className="relative w-full overflow-hidden rounded-xl">
          <div className="relative aspect-[16/9] w-full">
            <Image
              className="w-full h-full object-cover"
              title={event.title}
              image={rawImage}
              alt={event.title}
              priority
              context="hero"
              cacheKey={event.updatedAt}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground-strong/95 via-foreground-strong/70 to-foreground-strong/40" />

          <div className="absolute inset-x-0 bottom-0 px-4 pt-4 pb-4 sm:p-6 text-background">
            <h2 className="font-bold tracking-tight leading-tight mb-2 md:drop-shadow-2xl text-balance line-clamp-3 sm:line-clamp-none" style={{ fontSize: 'clamp(1.125rem, 2.5vw + 0.5rem, 1.875rem)' }}>
              {event.title}
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex flex-col gap-1 max-w-full">
                <span className="label inline-flex items-center gap-1.5 md:drop-shadow-lg">
                  <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                  {dateLabel}
                </span>
                {placeLabel && (
                  <span className="label inline-flex items-center gap-1.5 md:drop-shadow-lg">
                    <LocationMarkerIcon className="w-4 h-4 flex-shrink-0" />
                    {placeLabel}
                  </span>
                )}
              </div>
              <span className="btn-primary text-xs sm:text-sm inline-block w-fit">
                {t("readMore")}
              </span>
            </div>
          </div>
        </section>
      </PressableAnchor>
    );
  }

  return (
    <PressableAnchor
      href={href}
      prefetch={false}
      variant="card"
      className="w-full block"
      aria-label={event.title}
    >
      <article className="relative rounded-card overflow-hidden bg-background border border-border/20 hover:border-border/40 transition-colors duration-normal group w-full">
        <div className="relative aspect-[3/2] overflow-hidden bg-muted">
          <Image
            className="w-full h-full object-cover transition-transform group-hover:scale-[1.03]"
            title={event.title}
            image={rawImage}
            alt={event.title}
            context="card"
            cacheKey={event.updatedAt}
          />
        </div>

        <div className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold tracking-normal leading-snug mb-4 text-foreground-strong group-hover:text-primary/85 transition-colors">
            {event.title}
          </h3>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="badge-default inline-flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 flex-shrink-0" />
              {dateLabel}
            </span>
            {placeLabel && (
              <span className="badge-default inline-flex items-center gap-1.5">
                <LocationMarkerIcon className="w-4 h-4 flex-shrink-0" />
                {placeLabel}
              </span>
            )}
          </div>

          {plainDescription && (
            <p className="text-xs sm:text-sm font-normal leading-relaxed tracking-normal mb-5 text-foreground-strong/70 line-clamp-3">
              {plainDescription}
            </p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-primary inline-block">
              {t("readMore")}
            </span>
          </div>
        </div>
      </article>
    </PressableAnchor>
  );
}
