"use client";
import React from "react";
import { getFormattedDate } from "@utils/helpers";
import type { EventHeaderProps } from "types/event";

const EventHeader: React.FC<EventHeaderProps> = ({
  title,
  startDate,
  endDate,
}) => {
  // Use the same pattern as all other components in the codebase
  const { formattedStart, formattedEnd, nameDay } = getFormattedDate(
    startDate,
    endDate
  );

  const eventDate = formattedEnd
    ? `Del ${formattedStart} al ${formattedEnd}`
    : `${nameDay}, ${formattedStart}`;

  return (
    <div className="w-full flex flex-col justify-start items-start gap-2 px-4">
      <h1 className="text-2xl font-bold uppercase">{title}</h1>
    </div>
  );
};

export default EventHeader;
