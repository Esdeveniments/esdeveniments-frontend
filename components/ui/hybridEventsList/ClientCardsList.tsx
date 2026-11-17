"use client";

import { memo, ReactElement } from "react";

import List from "@components/ui/list";
import Card from "@components/ui/card";
import type { ListEvent } from "types/api/event";
import type { ClientCardsListProps } from "types/props";
import { hasCardImage } from "@utils/event-helpers";

function ClientCardsList({
  events,
  slotOffset = 0,
}: ClientCardsListProps): ReactElement {
  const priorityIndex = events.findIndex(hasCardImage);
  return (
    <List events={events}>
      {(event: ListEvent, index: number) => (
        <Card
          key={`${event.id ?? "ad"}-${index}`}
          event={event}
          isPriority={index === priorityIndex}
          headingLevel="h2"
          analyticsPosition={slotOffset + index + 1}
        />
      )}
    </List>
  );
}

export default memo(ClientCardsList);
