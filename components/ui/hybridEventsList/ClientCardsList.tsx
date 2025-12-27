"use client";

import { memo, ReactElement } from "react";

import List from "@components/ui/list";
import Card from "@components/ui/card";
import type { ListEvent } from "types/api/event";

function ClientCardsList({
  events,
}: {
  events: ListEvent[];
}): ReactElement {
  return (
    <List events={events}>
      {(event: ListEvent, index: number) => (
        <Card
          key={`${event.id ?? "ad"}-${index}`}
          event={event}
          isPriority={index === 0}
        />
      )}
    </List>
  );
}

export default memo(ClientCardsList);
