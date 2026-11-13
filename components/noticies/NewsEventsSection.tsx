import type { NewsEventsSectionProps } from "types/props";
import SectionHeading from "@components/ui/common/SectionHeading";
import CardContentServer from "@components/ui/common/cardContent/CardContentServer";
import { getCardLabels } from "@components/ui/common/cardContent/getCardLabels";
import { buildEventExcerpt } from "@utils/event-excerpt";

// Article events: a numbered list, one row card per event. `startPosition`
// keeps the numbering continuous across the article's sections.
export default async function NewsEventsSection({
  title,
  events,
  startPosition = 1,
}: NewsEventsSectionProps) {
  const labels = await getCardLabels();
  return (
    <section className="stack">
      <SectionHeading title={title} titleClassName="heading-2 text-foreground-strong" />
      <ol className="stack">
        {events.map((event, index) => (
          <li key={event.id}>
            <CardContentServer
              event={event}
              variant="row"
              labels={labels}
              position={startPosition + index}
              description={buildEventExcerpt(event.description, event.title)}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
