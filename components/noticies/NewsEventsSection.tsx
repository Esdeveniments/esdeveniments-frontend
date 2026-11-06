import type { NewsEventsSectionProps } from "types/props";
import SectionHeading from "@components/ui/common/SectionHeading";
import List from "@components/ui/list";
import CardServer from "@components/ui/card/CardServer";

// Article events use the same card and grid as the event listings.
export default function NewsEventsSection({ title, events }: NewsEventsSectionProps) {
  return (
    <section className="stack">
      <SectionHeading title={title} titleClassName="heading-2 text-foreground-strong" />
      <List events={events}>{(event) => <CardServer key={event.id} event={event} />}</List>
    </section>
  );
}
