"use client";

import { ReactNode, useMemo, JSX } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { parseFiltersFromUrl } from "@utils/url-filters";
import { extractURLSegments } from "@utils/url-parsing";
import type { CategorySummaryResponseDTO } from "types/api/category";

interface SsrListWrapperProps {
  children: ReactNode;
  categories?: CategorySummaryResponseDTO[];
}

// Declaratively controls visibility of the SSR list based on client-only filters.
// Keeps SSR content in the initial HTML for SEO, then hides it after hydration
// when client filters (search/distance/lat/lon) are active.
export default function SsrListWrapper({
  children,
  categories = [],
}: SsrListWrapperProps): JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hasClientFilters = useMemo(() => {
    const urlSegments = extractURLSegments(pathname || "/");
    const urlSearchParams = new URLSearchParams(searchParams?.toString() || "");
    const parsed = parseFiltersFromUrl(urlSegments, urlSearchParams, categories);
    const { search, distance, lat, lon } = parsed.queryParams;
    return !!(search || distance || lat || lon);
  }, [pathname, searchParams, categories]);

  return (
    <div
      data-ssr-list-wrapper
      hidden={hasClientFilters}
      aria-hidden={hasClientFilters ? "true" : undefined}
    >
      {children}
    </div>
  );
}


