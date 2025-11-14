import { PendingLink } from "@components/ui/navigation/PendingLink";
import Image from "next/image";
import type { NewsCardProps } from "types/props";
import { getFormattedDate } from "@utils/date-helpers";
import DOMPurify from "isomorphic-dompurify";

export default function NewsCard({
  event,
  placeSlug,
  placeLabel,
  variant = "default",
}: NewsCardProps) {
  const image = event.imageUrl;
  const formatted = getFormattedDate(event.startDate, event.endDate);
  const dateLabel = formatted.formattedEnd
    ? `${formatted.formattedStart} – ${formatted.formattedEnd}`
    : formatted.formattedStart;
  const href = `/noticies/${placeSlug}/${event.slug}`;
  const plainDescription = DOMPurify.sanitize(event.description || "", {
    ALLOWED_TAGS: [],
  });

  if (variant === "hero") {
    return (
      <section className="relative w-full overflow-hidden rounded-xl bg-foreground-strong shadow-lg">
        {image ? (
          <div className="relative aspect-[16/9] w-full md:h-80">
            <Image
              src={image || "/placeholder.svg"}
              alt={event.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 1024px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="aspect-[16/9] w-full bg-gradient-to-br from-primary-soft to-primary md:h-80" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground-strong/95 via-foreground-strong/70 to-foreground-strong/40" />

        <div className="absolute inset-x-0 bottom-0 px-4 pt-6 pb-8 sm:p-6 text-background">
          <h2 className="heading-1 mb-3 md:drop-shadow-2xl text-balance">
            {event.title}
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col gap-1 max-w-full">
              <span className="label inline-flex items-center md:drop-shadow-lg">
                📅 {dateLabel}
              </span>
              {placeLabel && (
                <span className="label inline-flex items-center md:drop-shadow-lg">
                  📍 {placeLabel}
                </span>
              )}
            </div>
            <PendingLink href={href} className="btn-primary">
              Llegir més
            </PendingLink>
          </div>
        </div>
      </section>
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
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 800px"
            className="aspect-[16/9] w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="aspect-[16/9] w-full bg-gradient-to-br from-foreground-strong to-border" />
        )}
      </div>

      <div className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {placeLabel && <span className="badge-default">📍 {placeLabel}</span>}
          <span className="badge-default">📅 {dateLabel}</span>
        </div>

        <h3 className="heading-3 mb-4 text-foreground-strong group-hover:text-primary transition-colors">
          <PendingLink
            href={href}
            className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
            aria-label={event.title}
          >
            {event.title}
          </PendingLink>
        </h3>

        {plainDescription && (
          <p className="body-small mb-5 text-foreground-strong/70 line-clamp-3">
            {plainDescription}
          </p>
        )}

        <div className="flex items-center justify-between">
          <PendingLink
            href={href}
            className="btn-primary"
            aria-label={`Llegir-ne més de ${event.title}`}
          >
            Llegir més
          </PendingLink>
        </div>
      </div>
    </article>
  );
}
