"use client";
import Description from "@components/ui/common/description";
import React from "react";
import type { EventDescriptionProps } from "types/event";

const EventDescription: React.FC<EventDescriptionProps> = ({
  description,
  location,
}) => {
  return (
    <div className="w-full flex justify-center items-start gap-2 px-4">
      <div className="max-w-none text-gray-800">
        <Description description={description} location={location} />
      </div>
    </div>
  );
};

export default EventDescription;
