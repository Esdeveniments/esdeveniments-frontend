import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { NewsRichCardProps } from "types/props";
import { getFormattedDate } from "@utils/date-helpers";
import DOMPurify from "isomorphic-dompurify";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import { getLocaleSafely } from "@utils/i18n-seo";

export default async function NewsRichCard({
  event,
  variant = "default",
  numbered,
}: NewsRichCardProps) {
  const locale = await getLocaleSafely();
  const t = await getTranslations({ locale, namespace: "Components.News" });
  const image = event.imageUrl;
  const formatted = getFormattedDate(event.startDate, event.endDate, locale);
  const dateLabel = formatted.formattedEnd
    ? `${formatted.formattedStart} – ${formatted.formattedEnd}`
    : formatted.formattedStart;
  const primaryCategory =
    event.categories && event.categories.length > 0
      ? { name: event.categories[0].name, slug: event.categories[0].slug }
      : undefined;
  const plainDescription = DOMPurify.sanitize(event.description || "", {
    ALLOWED_TAGS: [],
  });

  if (variant === "horizontal") {
    return (
      <article className="card-elevated group w-full overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6 p-6 relative z-[1]">
          {numbered && (
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-background">
                {numbered}
              </div>
            </div>
          )}

          <div className="md:flex-shrink-0">
            {image ? (
              <Image
                src={image || "/placeholder.svg"}
                alt={event.title}
                width={200}
                height={150}
                className="aspect-[4/3] w-full md:w-48 object-cover rounded-lg transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="aspect-[4/3] w-full md:w-48 bg-gradient-to-br from-foreground-strong to-border rounded-lg" />
            )}
          </div>

          <div className="flex-1 min-w-0">
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
              {event.location && (
                <span className="badge-default">📍 {event.location}</span>
              )}
              <span className="badge-default">📅 {dateLabel}</span>
            </div>

            <h3 className="heading-2 mb-3 text-foreground-strong group-hover:text-primary transition-colors">
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

            {plainDescription && (
              <p className="body-normal mb-4 text-foreground-strong/70 line-clamp-3">
                {plainDescription}
              </p>
            )}

            <div className="flex items-center justify-between">
              <PressableAnchor
                href={`/e/${event.slug}`}
                prefetch={false}
                className="btn-primary"
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
          {event.location && (
            <span className="badge-default">📍 {event.location}</span>
          )}
          <span className="badge-default">📅 {dateLabel}</span>
        </div>

        <h3 className="heading-3 mb-4 text-foreground-strong group-hover:text-primary transition-colors">
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

        {plainDescription && (
          <p className="body-small mb-5 text-foreground-strong/70 line-clamp-3">
            {plainDescription}
          </p>
        )}

        <div className="flex items-center justify-between">
          <PressableAnchor
            href={`/e/${event.slug}`}
            prefetch={false}
            className="btn-primary"
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
