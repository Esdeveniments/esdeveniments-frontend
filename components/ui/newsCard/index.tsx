import NextImage from "next/image";
import { getTranslations } from "next-intl/server";
import type { NewsCardProps } from "types/props";
import { getFormattedDate } from "@utils/date-helpers";
import { stripHtmlTags } from "@utils/sanitize";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { getLocaleSafely, withLocalePath } from "@utils/i18n-seo";
import { CalendarIcon, MapPinIcon as LocationMarkerIcon } from "@heroicons/react/24/outline";
import {
  getOptimalImageQuality,
  getOptimalImageSizes,
  getOptimalImageWidth,
} from "@utils/image-quality";
import { buildOptimizedImageUrl } from "@utils/image-cache";

export default async function NewsCard({
  event,
  placeSlug,
  placeLabel,
  variant = "default",
}: NewsCardProps) {
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.News" });
  const rawImage = event.imageUrl;
  const formatted = getFormattedDate(event.startDate, event.endDate, locale);
  const dateLabel = formatted.formattedEnd
    ? `${formatted.formattedStart} – ${formatted.formattedEnd}`
    : formatted.formattedStart;
  const href = withLocalePath(`/noticies/${placeSlug}/${event.slug}`, locale);
  const plainDescription = stripHtmlTags(event.description || "");

  if (variant === "hero") {
    const heroImageQuality = getOptimalImageQuality({
      isPriority: true,
      isExternal: true,
    });
    const heroImageWidth = getOptimalImageWidth("hero");
    const heroImageSizes = getOptimalImageSizes("hero");

    // Optimize external images through proxy
    const heroImage = rawImage
      ? buildOptimizedImageUrl(rawImage, event.updatedAt, {
        width: heroImageWidth,
        quality: heroImageQuality,
      })
      : "";

    return (
      <PressableAnchor
        href={href}
        prefetch={false}
        variant="card"
        className="relative w-full overflow-hidden rounded-xl bg-foreground-strong shadow-lg block"
        aria-label={event.title}
      >
        <section className="relative w-full overflow-hidden rounded-xl">
          {heroImage ? (
            <div className="relative aspect-[16/9] w-full">
              <NextImage
                src={heroImage}
                alt={event.title}
                fill
                unoptimized
                priority
                sizes={heroImageSizes}
                className="object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[16/9] w-full bg-gradient-to-br from-primary-soft to-primary" />
          )}
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

  const cardImageQuality = getOptimalImageQuality({
    isPriority: false,
    isExternal: true,
  });
  const cardImageWidth = getOptimalImageWidth("card");
  const cardImageSizes = getOptimalImageSizes("card");

  // Optimize external images through proxy
  const cardImage = rawImage
    ? buildOptimizedImageUrl(rawImage, event.updatedAt, {
      width: cardImageWidth,
      quality: cardImageQuality,
    })
    : "";

  return (
    <PressableAnchor
      href={href}
      prefetch={false}
      variant="card"
      className="w-full block"
      aria-label={event.title}
    >
      <article className="card-elevated group w-full overflow-hidden">
        <div className="relative overflow-hidden">
          {cardImage ? (
            <NextImage
              src={cardImage}
              alt={event.title}
              width={1200}
              height={675}
              unoptimized
              sizes={cardImageSizes}
              className="aspect-[16/9] w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="aspect-[16/9] w-full bg-gradient-to-br from-foreground-strong to-border" />
          )}
        </div>

        <div className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold tracking-normal leading-snug mb-4 text-foreground-strong group-hover:text-primary transition-colors">
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
            <span className="btn-primary text-xs sm:text-sm inline-block">
              {t("readMore")}
            </span>
          </div>
        </div>
      </article>
    </PressableAnchor>
  );
}
