import React from "react";
import Badge from "@components/ui/common/badge";
import { TagIcon } from "@heroicons/react/outline";
import type { EventCategoriesProps } from "types/event";
import SectionHeading from "@components/ui/common/SectionHeading";

const EventCategories: React.FC<EventCategoriesProps> = ({
  categories,
  place,
}) => {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="w-full">
      <div className="w-full flex flex-col gap-4 min-w-0">
        <SectionHeading
          icon={
            <TagIcon
              className="h-5 w-5 text-foreground-strong flex-shrink-0"
              aria-hidden="true"
            />
          }
          title="Categories"
        />
        <div className="flex flex-wrap gap-3 px-4">
          {categories.map((category) => (
            <Badge key={category.id} href={`/${place}/${category.slug}`}>
              {category.name}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventCategories;
