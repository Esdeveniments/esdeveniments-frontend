import type { FocusEventHandler, KeyboardEventHandler, RefObject } from "react";
import type { UserSearchResultDTO } from "./api/user";
import type { Option } from "./common";

/** A place with its name and slug folded once for suggestion matching. */
export interface PlaceSearchEntry<T extends Option = Option> {
  place: T;
  label: string;
  value: string;
}

/** Where a search was typed; also the GA `context` param. */
export type SearchContext = "search" | "hero_search" | "hero_cta";

export type SearchOutcome = "events_results" | "events_zero" | "place" | "profile" | "abandoned";

/** One option in the search suggestions list. `id` is `type:value`. */
export type SearchSuggestion =
  | { type: "events"; id: "events"; query: string }
  | { type: "place"; id: string; place: Option }
  | { type: "profile"; id: string; profile: UserSearchResultDTO };

/** Suggestions the search box navigates to itself; profiles are handled by the hook. */
export type SearchBoxSuggestion = Exclude<SearchSuggestion, { type: "profile" }>;

export interface ProfileSuggestions {
  profiles: UserSearchResultDTO[];
  /** A request for the current text is pending (or debouncing). */
  isLoading: boolean;
}

export interface UseSearchComboboxOptions {
  value: string;
  setValue: (value: string) => void;
  context: Exclude<SearchContext, "hero_cta">;
  /** Enter with no active option: the search box's own submit. */
  onSubmit: () => void;
  /** Open a picked events or place suggestion (GA and closing are handled). */
  onSelect: (suggestion: SearchBoxSuggestion) => void;
}

export interface SearchSuggestionsProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  listboxId: string;
  suggestions: SearchSuggestion[];
  activeId: string | null;
  profilesLoading: boolean;
  onSelect: (suggestion: SearchSuggestion) => void;
  /**
   * Tap or click outside the search box and the popup. `submitsSearch` is true
   * when the tap lands on a control that submits the same search.
   */
  onDismiss: (submitsSearch: boolean) => void;
}

export interface SearchSuggestionOptionProps {
  suggestion: SearchSuggestion;
  domId: string;
  active: boolean;
  onSelect: (suggestion: SearchSuggestion) => void;
}

export interface SearchSuggestionAvatarProps {
  profile: UserSearchResultDTO;
  /** Source of the initial shown when there is no avatar or it fails. */
  name: string;
}

export interface SearchComboboxInputProps {
  role: "combobox";
  "aria-autocomplete": "list";
  "aria-expanded": boolean;
  "aria-controls": string | undefined;
  "aria-activedescendant": string | undefined;
  onFocus: FocusEventHandler<HTMLInputElement>;
  onBlur: FocusEventHandler<HTMLInputElement>;
  onKeyDown: KeyboardEventHandler<HTMLInputElement>;
}

export interface SearchCombobox {
  /** Wraps the input and its buttons; the popup opens below it. */
  anchorRef: RefObject<HTMLDivElement | null>;
  /** Submits the typed text; use it for the box's own search button. */
  submit: () => void;
  inputProps: SearchComboboxInputProps;
  /** Null until the first focus, so the popup chunk isn't needed before. */
  popupProps: SearchSuggestionsProps | null;
}
