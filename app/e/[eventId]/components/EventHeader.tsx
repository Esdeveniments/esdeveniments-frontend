"use client";
import React from "react";
import type { EventHeaderProps } from "types/event";

const EventHeader: React.FC<EventHeaderProps> = ({
  title,
  eventDate,
  location,
  city = "",
  region = "",
}) => {
  return (
    <div className="w-full flex flex-col justify-start items-start gap-2 px-4">
      <span className="text-xs text-gray-400">
        {/* Use accessible date JSX from utility */}
        {typeof eventDate === 'string'
          ? eventDate
          : eventDate && 'jsx' in eventDate
            ? eventDate.jsx
            : eventDate}
      </span>
      <h1 className="text-2xl font-bold">{title}</h1>
      <span className="text-sm text-gray-500">{location}</span>
      {(city || region) && (
        <span className="text-xs text-gray-400">
          {[city, region].filter(Boolean).join(", ")}
        </span>
      )}
    </div>
  );
};

export default EventHeader;
