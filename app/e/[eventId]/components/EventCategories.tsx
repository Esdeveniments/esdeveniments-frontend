import React from "react";
import Badge from "@components/ui/common/badge";
import { TagIcon } from "@heroicons/react/outline";
import type { EventCategoriesProps } from "types/event";
import SectionHeading from "@components/ui/common/SectionHeading";
import { buildCanonicalUrl } from "@utils/url-filters";

const EventCategories: React.FC<EventCategoriesProps> = ({
  categories,
  place,
}) => {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="w-full">
      <div className="w-full flex flex-col gap-element-gap min-w-0">
        <SectionHeading
          Icon={TagIcon}
          iconClassName="h-5 w-5 text-foreground-strong flex-shrink-0"
          title="Categories"
          titleClassName="heading-2"
        />
        <div className="flex flex-wrap gap-element-gap px-section-x text-foreground-strong">
          {categories.map((category) => (
            <Badge
              key={category.id}
              href={buildCanonicalUrl({ place, category: category.slug })}
            >
              {category.name}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventCategories;
