import React from "react";
import type { EventTagsProps } from "types/event";

const EventTags: React.FC<EventTagsProps> = ({ tags }) => {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="w-full pb-element-gap-sm flex flex-wrap gap-element-gap-sm">
      {tags.map((tag) => (
        <span key={tag} className="badge-default">
          {tag}
        </span>
      ))}
    </div>
  );
};

export default EventTags;
