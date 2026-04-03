"use client";

import { JSX } from "react";
import type { SsrListWrapperProps } from "types/props";
import { useSharedUrlFilters } from "@components/context/UrlFiltersContext";
import { hasActiveClientFilters } from "@utils/url-filters";

// Declaratively controls visibility of the SSR list based on client-only filters.
// Keeps SSR content in the initial HTML for SEO, then hides it after hydration
// when any client filter is active (see hasActiveClientFilters for the full list).
export default function SsrListWrapper({
  children,
}: SsrListWrapperProps): JSX.Element {
  const { queryParams } = useSharedUrlFilters();
  const hasClientFilters = hasActiveClientFilters(queryParams);

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

