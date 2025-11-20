"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { CategorySummaryResponseDTO } from "types/api/category";
import type { ParsedFilters } from "types/url-filters";
import { extractURLSegments } from "@utils/url-parsing";
import { parseFiltersFromUrl } from "@utils/url-filters";

/**
 * Shared hook for parsing filters from the current URL.
 * Keeps all URL parsing logic centralized to avoid duplication.
 */
export function useUrlFilters(
  categories?: CategorySummaryResponseDTO[]
): ParsedFilters {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(() => {
    const segments = extractURLSegments(pathname || "/");
    const urlSearchParams = new URLSearchParams(searchParams?.toString() || "");
    return parseFiltersFromUrl(segments, urlSearchParams, categories);
  }, [pathname, searchParams, categories]);
}

