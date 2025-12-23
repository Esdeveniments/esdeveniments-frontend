"use client";

import { JSX } from "react";
import { useSearchParams } from "next/navigation";
import type { SsrListWrapperProps } from "types/props";
import { useUrlFilters } from "@components/hooks/useUrlFilters";

// Declaratively controls visibility of the SSR list based on client-only filters.
// Keeps SSR content in the initial HTML for SEO, then hides it after hydration
// when client filters (search/distance/lat/lon) are active OR when Map view is active.
export default function SsrListWrapper({
  children,
  categories = [],
}: SsrListWrapperProps): JSX.Element {
  const { queryParams } = useUrlFilters(categories);
  const { search, distance, lat, lon } = queryParams;
  const searchParams = useSearchParams();
  
  // Check for standard filters
  const hasClientFilters = !!(search || distance || lat || lon);
  
  // Check for Map view
  const isMapView = searchParams.get("view") === "map";
  
  // Hide SSR list if we are filtering OR if we are in Map view
  const shouldHide = hasClientFilters || isMapView;

  return (
    <div
      data-ssr-list-wrapper
      hidden={shouldHide}
      aria-hidden={shouldHide ? "true" : undefined}
    >
      {children}
    </div>
  );
}

