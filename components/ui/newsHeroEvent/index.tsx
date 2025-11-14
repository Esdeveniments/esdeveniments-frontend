import { CardLink } from "@components/ui/navigation/CardLink";
import Image from "next/image";
import type { NewsHeroEventProps } from "types/props";
import { getFormattedDate } from "@utils/date-helpers";

export default function NewsHeroEvent({ event }: NewsHeroEventProps) {
  const image = event.imageUrl;
  const formatted = getFormattedDate(event.startDate, event.endDate);
  const dateLabel = formatted.formattedEnd
    ? `${formatted.formattedStart} – ${formatted.formattedEnd}`
    : formatted.formattedStart;
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
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground-strong/95 via-foreground-strong/70 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pt-6 pb-8 sm:p-6 text-background">
        <h2 className="mb-3 text-3xl font-extrabold leading-tight md:drop-shadow-2xl md:text-4xl lg:text-5xl text-balance">
          {event.title}
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1 max-w-full">
            <span className="inline-flex items-center text-sm font-medium md:drop-shadow-lg md:text-base">
              📅 {dateLabel}
            </span>
            {event.location && (
              <span className="inline-flex items-center text-sm font-medium md:drop-shadow-lg md:text-base">
                📍 {event.location}
              </span>
            )}
          </div>
          <CardLink
            href={`/e/${event.slug}`}
            className="btn-primary"
          >
            Llegir més
          </CardLink>
        </div>
      </div>
    </section>
  );
}
