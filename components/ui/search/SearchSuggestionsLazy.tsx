"use client";

import dynamic from "next/dynamic";

const load = () => import("./SearchSuggestions");

/** Starts loading the suggestions chunk (first focus of a search box). */
export const preloadSearchSuggestions = (): void => {
  void load();
};

/**
 * The suggestions popup, in its own chunk so the navbar and the hero don't
 * ship it. Client-only: it portals to `document.body` and measures the input.
 */
const SearchSuggestionsLazy = dynamic(load, { ssr: false, loading: () => null });

export default SearchSuggestionsLazy;
