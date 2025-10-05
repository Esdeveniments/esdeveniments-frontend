import React from "react";
import type { EventTagsProps } from "types/event";
import { Text } from "components/ui/primitives/Text";

const EventTags: React.FC<EventTagsProps> = ({ tags }) => {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex w-full flex-wrap gap-component-xs px-component-md pb-component-xs">
      {tags.map((tag) => (
        <Text
          key={tag}
          as="span"
          variant="caption"
          className="rounded-full bg-darkCorp/80 px-component-sm py-component-xs font-medium text-blackCorp"
        >
          {tag}
        </Text>
      ))}
    </div>
  );
};

export default EventTags;
