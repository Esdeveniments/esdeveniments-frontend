import Link from "next/link";
import Image from "next/image";
import type { NewsRichCardProps } from "types/props";
import { getFormattedDate } from "@utils/date-helpers";
import DOMPurify from "isomorphic-dompurify";

export default function NewsRichCard({
  event,
  variant = "default",
  numbered,
}: NewsRichCardProps) {
  const image = event.imageUrl;
  const formatted = getFormattedDate(event.startDate, event.endDate);
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
      <article className="group w-full overflow-hidden rounded-xl border border-bColor bg-whiteCorp shadow-sm transition-all hover:shadow-lg hover:border-blackCorp/20">
        <div className="flex flex-col md:flex-row gap-6 p-6 relative z-[1]">
          {numbered && (
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-whiteCorp">
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
              <div className="aspect-[4/3] w-full md:w-48 bg-gradient-to-br from-darkCorp to-bColor rounded-lg" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {primaryCategory && (
                <Link
                  href={`/catalunya/${primaryCategory.slug}`}
                  prefetch={false}
                  className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-whiteCorp transition-colors hover:bg-primarydark"
                  aria-label={`Veure categoria ${primaryCategory.name}`}
                >
                  {primaryCategory.name}
                </Link>
              )}
              {event.location && (
                <span className="inline-flex items-center rounded-full bg-darkCorp px-3 py-1 text-xs font-medium text-blackCorp">
                  📍 {event.location}
                </span>
              )}
              <span className="inline-flex items-center rounded-full bg-darkCorp px-3 py-1 text-xs font-medium text-blackCorp">
                📅 {dateLabel}
              </span>
            </div>

            <h3 className="mb-3 text-2xl font-bold leading-tight text-blackCorp group-hover:text-primary transition-colors">
              <Link
                href={`/e/${event.slug}`}
                prefetch={false}
                className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
                aria-label={event.title}
              >
                {event.title}
              </Link>
            </h3>

            {plainDescription && (
              <p className="mb-4 text-base leading-relaxed text-blackCorp/70 line-clamp-3">
                {plainDescription}
              </p>
            )}

            <div className="flex items-center justify-between">
              <Link
                href={`/e/${event.slug}`}
                prefetch={false}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-whiteCorp transition-all hover:bg-primarydark hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label={`Llegir-ne més de ${event.title}`}
              >
                Llegir més
              </Link>
            </div>
          </div>
        </div>
      </article>
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
          {primaryCategory && (
            <Link
              href={`/catalunya/${primaryCategory.slug}`}
              prefetch={false}
              className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-whiteCorp transition-colors hover:bg-primarydark"
              aria-label={`Veure categoria ${primaryCategory.name}`}
            >
              {primaryCategory.name}
            </Link>
          )}
          {event.location && (
            <span className="inline-flex items-center rounded-full bg-darkCorp px-3 py-1 text-xs font-medium text-blackCorp">
              📍 {event.location}
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-darkCorp px-3 py-1 text-xs font-medium text-blackCorp">
            📅 {dateLabel}
          </span>
        </div>

        <h3 className="mb-4 text-xl font-bold leading-tight text-blackCorp group-hover:text-primary transition-colors">
          <Link
            href={`/e/${event.slug}`}
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
            href={`/e/${event.slug}`}
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
