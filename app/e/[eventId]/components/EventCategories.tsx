import React from "react";
import { Badge, Text } from "@components/ui/primitives";
import { TagIcon } from "@heroicons/react/outline";
import type { EventCategoriesProps } from "types/event";

const EventCategories: React.FC<EventCategoriesProps> = ({
  categories,
  place,
}) => {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="flex w-full items-start justify-center gap-component-xs px-component-md">
      <TagIcon
        className="mt-component-xs h-5 w-5 flex-shrink-0 text-blackCorp"
        aria-hidden="true"
      />
      <div className="flex w-11/12 flex-col gap-component-md">
        <Text as="h2" className="font-semibold text-blackCorp">
          Categories
        </Text>
        <div className="flex flex-wrap gap-component-sm">
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
