"use client";
import React from "react";
import type { EventTagsProps } from "types/event";

const EventTags: React.FC<EventTagsProps> = ({ tags }) => {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="w-full px-4 pb-2 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="bg-gray-200 text-gray-700 rounded-full px-3 py-1 text-xs font-medium"
        >
          {tag}
        </span>
      ))}
    </div>
  );
};

export default EventTags;
