"use client";

import type { JSX } from "react";
import type { CountLineProps } from "types/props";
import { useSharedUrlFilters } from "@components/context/UrlFiltersContext";
import { hasActiveClientFilters } from "@utils/url-filters";

// The count is for the unfiltered page. Client filters (distance, search…)
// swap the list for narrower results, so hide it then, like SsrListWrapper.
export default function CountLine({ text }: CountLineProps): JSX.Element {
  const { queryParams } = useSharedUrlFilters();
  return <span hidden={hasActiveClientFilters(queryParams)}>{text} </span>;
}
