"use client";
import Description from "@components/ui/common/description";
import React from "react";
import type { EventDescriptionProps } from "types/event";

const EventDescription: React.FC<EventDescriptionProps> = ({ description }) => {
  return (
    <div className="w-full px-4">
      <div className="prose prose-sm max-w-none text-gray-800">
        <Description description={description} />
      </div>
    </div>
  );
};

export default EventDescription;
