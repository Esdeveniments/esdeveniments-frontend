"use client";
import React from "react";
import dynamic from "next/dynamic";
import type { EventsAroundProps } from "types/common";

const EventsAround = dynamic(() => import("components/ui/eventsAround"), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});

const EventsAroundWrapper: React.FC<EventsAroundProps> = ({
  id,
  title = "Esdeveniments relacionats",
  town,
  region,
  ...rest
}) => {
  return (
    <EventsAround id={id} title={title} town={town} region={region} {...rest} />
  );
};

export default EventsAroundWrapper;
