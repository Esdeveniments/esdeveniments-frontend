"use client";

import { ReactElement } from "react";
import type { SearchAwareHeadingProps } from "types/props";
import { appendSearchQuery } from "@utils/notFoundMessaging";
import { useUrlFilters } from "@components/hooks/useUrlFilters";
import HeadingLayout from "./HeadingLayout";

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
    <HeadingLayout
      title={enhancedTitle}
      subtitle={enhancedSubtitle}
      titleClass={titleClass}
      subtitleClass={subtitleClass}
      cta={cta}
    />
  );
}
