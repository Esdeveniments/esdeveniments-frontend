"use client";

import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
import { transformRegionsToOptions } from "@components/ui/locationDiscoveryWidget/utils";
import type { Option } from "types/common";

/**
 * Every region and town as `{ label, value: slug }`, for matching typed text
 * to a place. Loads only once `enabled` (SWR-cached 24 h and shared by every
 * caller), so pages pay nothing until someone searches.
 */
export function useSearchPlaces(enabled: boolean): Option[] {
  const { regionsWithCities } = useGetRegionsWithCities(enabled);
  return regionsWithCities ? transformRegionsToOptions(regionsWithCities) : [];
}
