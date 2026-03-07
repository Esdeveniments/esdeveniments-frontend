"use client";

import { JSX } from "react";
import type { SsrListWrapperProps } from "types/props";
import { useSharedUrlFilters } from "@components/context/UrlFiltersContext";

// Declaratively controls visibility of the SSR list based on client-only filters.
// Keeps SSR content in the initial HTML for SEO, then hides it after hydration
// when client filters (search/distance/lat/lon) are active.
export default function SsrListWrapper({
  children,
}: SsrListWrapperProps): JSX.Element {
  const { queryParams } = useSharedUrlFilters();
  const { search, distance, lat, lon } = queryParams;
  const hasClientFilters = !!(search || distance || lat || lon);

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

