import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { NewsCardProps } from "types/props";
import { getFormattedDate } from "@utils/date-helpers";
import DOMPurify from "isomorphic-dompurify";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { getLocaleSafely, withLocalePath } from "@utils/i18n-seo";
import { CalendarIcon, LocationMarkerIcon } from "@heroicons/react/outline";

export default async function NewsCard({
  event,
  placeSlug,
  placeLabel,
  variant = "default",
}: NewsCardProps) {
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.News" });
  const image = event.imageUrl;
  const formatted = getFormattedDate(event.startDate, event.endDate, locale);
  const dateLabel = formatted.formattedEnd
    ? `${formatted.formattedStart} – ${formatted.formattedEnd}`
    : formatted.formattedStart;
  const href = withLocalePath(`/noticies/${placeSlug}/${event.slug}`, locale);
  const plainDescription = DOMPurify.sanitize(event.description || "", {
    ALLOWED_TAGS: [],
  });

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
          {image ? (
            <div className="relative aspect-[16/9] w-full">
              <Image
                src={image || "/placeholder.svg"}
                alt={event.title}
                fill
                priority
                sizes="(max-width: 768px) 82vw, (max-width: 1280px) 75vw, 1200px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[16/9] w-full bg-gradient-to-br from-primary-soft to-primary" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground-strong/95 via-foreground-strong/70 to-foreground-strong/40" />

          <div className="absolute inset-x-0 bottom-0 px-4 pt-4 pb-4 sm:p-6 text-background">
            <h2 className="heading-1 mb-2 md:drop-shadow-2xl text-balance line-clamp-3 sm:line-clamp-none">
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
              <span className="btn-primary inline-block">
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
      <article className="card-elevated group w-full overflow-hidden">
        <div className="relative overflow-hidden">
          {image ? (
            <Image
              src={image || "/placeholder.svg"}
              alt={event.title}
              width={1200}
              height={675}
              sizes="(max-width: 768px) 88vw, (max-width: 1280px) 70vw, 800px"
              className="aspect-[16/9] w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="aspect-[16/9] w-full bg-gradient-to-br from-foreground-strong to-border" />
          )}
        </div>

        <div className="p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {placeLabel && (
              <span className="badge-default inline-flex items-center gap-1.5">
                <LocationMarkerIcon className="w-4 h-4 flex-shrink-0" />
                {placeLabel}
              </span>
            )}
            <span className="badge-default inline-flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 flex-shrink-0" />
              {dateLabel}
            </span>
          </div>

          <h3 className="heading-3 mb-4 text-foreground-strong group-hover:text-primary transition-colors">
            {event.title}
          </h3>

          {plainDescription && (
            <p className="body-small mb-5 text-foreground-strong/70 line-clamp-3">
              {plainDescription}
            </p>
          )}

          <div className="flex items-center justify-between">
            <span className="btn-primary inline-block">
              {t("readMore")}
            </span>
          </div>
        </div>
      </article>
    </PressableAnchor>
  );
}
