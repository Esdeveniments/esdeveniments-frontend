"use client";

import { memo, ReactElement } from "react";

import List from "@components/ui/list";
import Card from "@components/ui/card";
import type { ListEvent } from "types/api/event";
import { hasCardImage } from "@utils/event-helpers";

function ClientCardsList({
  events,
}: {
  events: ListEvent[];
}): ReactElement {
  const priorityIndex = events.findIndex(hasCardImage);
  return (
    <List events={events}>
      {(event: ListEvent, index: number) => (
        <Card
          key={`${event.id ?? "ad"}-${index}`}
          event={event}
          isPriority={index === priorityIndex}
        />
      )}
    </List>
  );
}

export default memo(ClientCardsList);
