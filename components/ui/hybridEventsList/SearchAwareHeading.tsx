"use client";

import { ReactElement, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { SearchAwareHeadingProps } from "types/props";
import { extractURLSegments } from "@utils/url-parsing";
import { parseFiltersFromUrl } from "@utils/url-filters";
import { appendSearchQuery } from "@utils/notFoundMessaging";

export default function SearchAwareHeading({
  pageData,
  categories = [],
  titleClass,
  subtitleClass,
  cta,
}: SearchAwareHeadingProps): ReactElement {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const searchTerm = useMemo(() => {
    const paramsString = searchParams?.toString() || "";
    const urlSearchParams = new URLSearchParams(paramsString);
    const segments = extractURLSegments(pathname || "/");
    const parsed = parseFiltersFromUrl(segments, urlSearchParams, categories);
    return parsed.queryParams.search;
  }, [searchParams, pathname, categories]);

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
