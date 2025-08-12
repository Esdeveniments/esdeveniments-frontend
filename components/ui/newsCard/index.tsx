import Link from "next/link";
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
      <section className="relative w-full overflow-hidden rounded-xl bg-darkCorp shadow-lg">
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
          <div className="aspect-[16/9] w-full bg-gradient-to-br from-primarySoft to-primary md:h-80" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-fullBlackCorp/95 via-fullBlackCorp/70 to-fullBlackCorp/40" />

        <div className="absolute inset-x-0 bottom-0 px-4 pt-6 pb-8 sm:p-6 text-whiteCorp">
          <h2 className="mb-3 text-3xl font-extrabold leading-tight md:drop-shadow-2xl md:text-4xl lg:text-5xl text-balance">
            {event.title}
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col gap-1 max-w-full">
              <span className="inline-flex items-center text-sm font-medium md:drop-shadow-lg md:text-base">
                📅 {dateLabel}
              </span>
              {placeLabel && (
                <span className="inline-flex items-center text-sm font-medium md:drop-shadow-lg md:text-base">
                  📍 {placeLabel}
                </span>
              )}
            </div>
            <Link
              href={href}
              prefetch={false}
              className="inline-flex items-center self-start sm:self-auto rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-whiteCorp shadow-md sm:shadow-xl transition-colors hover:bg-primarydark sm:hover:shadow-2xl md:px-6 md:py-3 md:text-base"
            >
              Llegir més
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <article className="group w-full overflow-hidden rounded-xl border border-bColor bg-whiteCorp shadow-sm transition-all hover:shadow-lg hover:border-blackCorp/20">
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
          <div className="aspect-[16/9] w-full bg-gradient-to-br from-darkCorp to-bColor" />
        )}
      </div>

      <div className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {placeLabel && (
            <span className="inline-flex items-center rounded-full bg-darkCorp px-3 py-1 text-xs font-medium text-blackCorp">
              📍 {placeLabel}
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-darkCorp px-3 py-1 text-xs font-medium text-blackCorp">
            📅 {dateLabel}
          </span>
        </div>

        <h3 className="mb-4 text-xl font-bold leading-tight text-blackCorp group-hover:text-primary transition-colors">
          <Link
            href={href}
            prefetch={false}
            className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
            aria-label={event.title}
          >
            {event.title}
          </Link>
        </h3>

        {plainDescription && (
          <p className="mb-5 text-sm leading-relaxed text-blackCorp/70 line-clamp-3">
            {plainDescription}
          </p>
        )}

        <div className="flex items-center justify-between">
          <Link
            href={href}
            prefetch={false}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-whiteCorp transition-all hover:bg-primarydark hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label={`Llegir-ne més de ${event.title}`}
          >
            Llegir més
          </Link>
        </div>
      </div>
    </article>
  );
}
