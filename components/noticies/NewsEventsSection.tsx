import type { NewsEventsSectionProps } from "types/props";
import NewsRichCard from "@components/ui/newsRichCard";

export default function NewsEventsSection({
  title,
  events,
  showNumbered = false,
}: NewsEventsSectionProps) {
  return (
    <section className="mb-12 sm:mb-16">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground-strong mb-3">
          {title}
        </h2>
        <div className="w-20 h-1.5 bg-primary rounded-full"></div>
      </div>

      {showNumbered ? (
        <div className="space-y-6 sm:space-y-8">
          {events.map((event, index) => (
            <div key={event.id} className="flex gap-4 sm:gap-6 items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-background rounded-full flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <NewsRichCard event={event} variant="horizontal" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <NewsRichCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
