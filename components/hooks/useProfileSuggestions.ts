"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  PROFILE_SEARCH_ENABLED,
  SEARCH_SUGGESTIONS_DEBOUNCE_MS,
  USER_SEARCH_SIZE,
} from "@config/search";
import { toProfileSearchQuery } from "@utils/search-query";
import type { UserSearchResultDTO } from "types/api/user";
import type { ProfileSuggestions } from "types/search";

async function fetchProfiles([, query]: readonly [string, string]): Promise<UserSearchResultDTO[]> {
  const params = new URLSearchParams({ q: query, size: String(USER_SEARCH_SIZE.default) });
  const res = await fetch(`/api/users?${params}`);
  if (!res.ok) throw new Error(`Profile search failed: ${res.status}`);
  return res.json();
}

/**
 * Profiles matching the typed text, once it has been still for the debounce
 * delay. No request at all while `PROFILE_SEARCH_ENABLED` is false or before
 * `enabled`. SWR returns data only for the current key, so a slow answer for
 * older text is cached but never shown.
 */
export function useProfileSuggestions(text: string, enabled: boolean): ProfileSuggestions {
  const query = PROFILE_SEARCH_ENABLED && enabled ? toProfileSearchQuery(text) : null;
  const [debouncedQuery, setDebouncedQuery] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_SUGGESTIONS_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const settled = query !== null && query === debouncedQuery;
  const { data, error } = useSWR(settled ? (["user-search", query] as const) : null, fetchProfiles, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    shouldRetryOnError: false,
    dedupingInterval: 60_000,
  });

  if (!query) return { profiles: [], isLoading: false };
  if (data) return { profiles: data, isLoading: false };
  // On error the group just hides; the other suggestions still work.
  return { profiles: [], isLoading: !(settled && error) };
}
