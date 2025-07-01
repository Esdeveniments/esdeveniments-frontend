import React from "react";
import type { EventHeaderProps } from "types/event";

const EventHeader: React.FC<EventHeaderProps> = ({ title }) => {
  return (
    <div className="w-full flex flex-col justify-start items-start gap-2 px-4">
      <h1 className="text-2xl font-bold uppercase">{title}</h1>
    </div>
  );
};

export default EventHeader;
