import NextImage from "next/image";
import { getTranslations } from "next-intl/server";
import { CalendarIcon, MapPinIcon as LocationMarkerIcon } from "@heroicons/react/24/outline";
import type { NewsHeroEventProps } from "types/props";
import { getFormattedDate } from "@utils/date-helpers";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { getLocaleSafely } from "@utils/i18n-seo";
import { buildOptimizedImageUrl } from "@utils/image-cache";
import {
  getOptimalImageQuality,
  getOptimalImageWidth,
} from "@utils/image-quality";

export default async function NewsHeroEvent({ event }: NewsHeroEventProps) {
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.News" });
  const rawImage = event.imageUrl;

  // Optimize external images through proxy
  const imageQuality = getOptimalImageQuality({
    isPriority: true,
    isExternal: true,
  });
  const imageWidth = getOptimalImageWidth("hero");
  const image = rawImage
    ? buildOptimizedImageUrl(rawImage, event.hash || event.updatedAt, {
        width: imageWidth,
        quality: imageQuality,
      })
    : "";

  const formatted = getFormattedDate(event.startDate, event.endDate, locale);
  const dateLabel = formatted.formattedEnd
    ? `${formatted.formattedStart} – ${formatted.formattedEnd}`
    : formatted.formattedStart;
  return (
    <section className="relative w-full overflow-hidden rounded-xl bg-foreground-strong shadow-lg">
      {image ? (
        <div className="relative aspect-[16/9] w-full md:h-80">
          <NextImage
            src={image}
            alt={event.title}
            fill
            unoptimized
            priority
            sizes="(max-width: 768px) 82vw, (max-width: 1280px) 75vw, 1200px"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="aspect-[16/9] w-full bg-gradient-to-br from-primary-soft to-primary md:h-80" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground-strong/95 via-foreground-strong/70 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pt-6 pb-8 sm:p-6 text-background">
        <h2 className="mb-3 text-3xl font-extrabold leading-tight md:drop-shadow-2xl md:text-4xl lg:text-5xl text-balance">
          {event.title}
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1 max-w-full">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium md:drop-shadow-lg md:text-base">
              <CalendarIcon className="w-5 h-5 flex-shrink-0" />
              {dateLabel}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium md:drop-shadow-lg md:text-base">
                <LocationMarkerIcon className="w-5 h-5 flex-shrink-0" />
                {event.location}
              </span>
            )}
          </div>
          <PressableAnchor
            href={`/e/${event.slug}`}
            prefetch={false}
            className="btn-primary"
            variant="inline"
          >
            {t("readMore")}
          </PressableAnchor>
        </div>
      </div>
    </section>
  );
}
