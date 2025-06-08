"use client";
import React from "react";
import dynamic from "next/dynamic";
import { ShareIcon } from "@heroicons/react/outline";
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
    <div className="w-full flex justify-center items-start gap-2 px-4">
      <ShareIcon className="w-5 h-5 mt-1" />
      <div className="w-11/12 flex flex-col gap-4">
        <h2>{title}</h2>
        <EventsAround id={id} title={title} town={town} region={region} {...rest} />
      </div>
    </div>
  );
};

export default EventsAroundWrapper;
