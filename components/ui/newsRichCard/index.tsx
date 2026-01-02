import NextImage from "next/image";
import { getTranslations } from "next-intl/server";
import { CalendarIcon, MapPinIcon as LocationMarkerIcon } from "@heroicons/react/24/outline";
import type { NewsRichCardProps } from "types/props";
import { getFormattedDate } from "@utils/date-helpers";
import { stripHtmlTags } from "@utils/sanitize";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { getLocaleSafely } from "@utils/i18n-seo";
import {
  getOptimalImageQuality,
  getOptimalImageWidth,
} from "@utils/image-quality";
import { buildOptimizedImageUrl } from "@utils/image-cache";

export default async function NewsRichCard({
  event,
  variant = "default",
  numbered,
}: NewsRichCardProps) {
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.News" });
  const rawImage = event.imageUrl;
  const formatted = getFormattedDate(event.startDate, event.endDate, locale);
  const dateLabel = formatted.formattedEnd
    ? `${formatted.formattedStart} – ${formatted.formattedEnd}`
    : formatted.formattedStart;
  const primaryCategory =
    event.categories && event.categories.length > 0
      ? { name: event.categories[0].name, slug: event.categories[0].slug }
      : undefined;
  const plainDescription = stripHtmlTags(event.description || "");

  // Optimize external images through proxy
  const imageQuality = getOptimalImageQuality({
    isPriority: false,
    isExternal: true,
  });
  const imageWidth = getOptimalImageWidth(variant === "horizontal" ? "list" : "card");
  const image = rawImage
    ? buildOptimizedImageUrl(rawImage, event.hash, {
        width: imageWidth,
        quality: imageQuality,
      })
    : "";

  if (variant === "horizontal") {
    return (
      <article className="card-elevated group w-full overflow-hidden">
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 p-4 sm:p-6 relative z-[1]">
          {numbered && (
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-background">
                {numbered}
              </div>
            </div>
          )}

          <div className="md:flex-shrink-0">
            {image ? (
              <NextImage
                src={image}
                alt={event.title}
                width={200}
                height={150}
                unoptimized
                className="aspect-[4/3] w-full md:w-48 object-cover rounded-lg transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="aspect-[4/3] w-full md:w-48 bg-gradient-to-br from-foreground-strong to-border rounded-lg" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold tracking-normal leading-snug mb-3 text-foreground-strong group-hover:text-primary transition-colors">
              <PressableAnchor
                href={`/e/${event.slug}`}
                prefetch={false}
                className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
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
                  className="badge-primary"
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
                className="btn-primary text-xs sm:text-sm"
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
    <article className="card-elevated group w-full overflow-hidden">
      <div className="relative overflow-hidden">
        {image ? (
          <NextImage
            src={image}
            alt={event.title}
            width={1200}
            height={675}
            unoptimized
            sizes="(max-width: 768px) 88vw, (max-width: 1280px) 70vw, 800px"
            className="aspect-[16/9] w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="aspect-[16/9] w-full bg-gradient-to-br from-foreground-strong to-border" />
        )}
      </div>

      <div className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg md:text-xl font-semibold tracking-normal leading-snug mb-4 text-foreground-strong group-hover:text-primary transition-colors">
          <PressableAnchor
            href={`/e/${event.slug}`}
            prefetch={false}
            className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
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
              className="badge-primary"
              aria-label={`Veure categoria ${primaryCategory.name}`}
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
            className="btn-primary text-xs sm:text-sm"
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
