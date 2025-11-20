"use client";

import { ReactElement } from "react";
import type { SearchAwareHeadingProps } from "types/props";
import { appendSearchQuery } from "@utils/notFoundMessaging";
import { useUrlFilters } from "@components/hooks/useUrlFilters";

export default function SearchAwareHeading({
  pageData,
  categories = [],
  titleClass,
  subtitleClass,
  cta,
}: SearchAwareHeadingProps): ReactElement {
  const { queryParams } = useUrlFilters(categories);
  const searchTerm = queryParams.search;

  const enhancedTitle = appendSearchQuery(pageData.title, searchTerm);
  const enhancedSubtitle = appendSearchQuery(pageData.subTitle, searchTerm);

  return (
    <>
      <div className="px-section-x mt-element-gap mb-element-gap md:flex md:items-start md:justify-between gap-element-gap">
        <h1 className={`${titleClass} flex-1`}>{enhancedTitle}</h1>
        {cta}
      </div>
      <p className={`${subtitleClass} text-left mb-element-gap px-section-x`}>
        {enhancedSubtitle}
      </p>
    </>
  );
}
