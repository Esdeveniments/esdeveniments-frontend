"use client";
import React from "react";
import Link from "next/link";
import { TagIcon } from "@heroicons/react/outline";
import type { EventCategoriesProps } from "types/event";

const EventCategories: React.FC<EventCategoriesProps> = ({
  categories,
  place,
}) => {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="w-full flex justify-center items-start gap-2 px-4">
      <TagIcon
        className="h-5 w-5 mt-1 text-blackCorp flex-shrink-0"
        aria-hidden="true"
      />
      <div className="w-11/12 flex flex-col gap-4">
        <h2 className="text-blackCorp font-semibold">Categories</h2>
        <div className="flex flex-wrap gap-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/${place}/${category.slug}`}
              className="text-blackCorp bg-whiteCorp hover:bg-primary hover:border-whiteCorp hover:text-whiteCorp border-blackCorp rounded-xl py-2 px-4 ease-in-out duration-300 border focus:outline-none font-barlow italic uppercase font-semibold tracking-wide text-sm"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventCategories;
