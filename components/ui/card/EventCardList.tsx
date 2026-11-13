import List from "@components/ui/list";
import { getCardLabels } from "@components/ui/common/cardContent/getCardLabels";
import type { EventCardListProps } from "types/props";
import CardServer from "./CardServer";

export default async function EventCardList({
  events,
  priorityIndex = 0,
  headingLevel,
  initialIsFavorite,
}: EventCardListProps) {
  if (events.length === 0) return null;
  const labels = await getCardLabels();

  return (
    <List events={events}>
      {(event, index) => (
        <CardServer
          event={event}
          labels={labels}
          isPriority={index === priorityIndex}
          initialIsFavorite={initialIsFavorite}
          headingLevel={headingLevel}
        />
      )}
    </List>
  );
}
