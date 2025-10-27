import React from "react";
import type { EventTagsProps } from "types/event";

const EventTags: React.FC<EventTagsProps> = ({ tags }) => {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="w-full pb-2 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span key={tag} className="badge-default">
          {tag}
        </span>
      ))}
    </div>
  );
};

export default EventTags;
