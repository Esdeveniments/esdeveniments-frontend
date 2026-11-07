"use client";

import { useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useRouter } from "@i18n/routing";
import { useProfileSuggestions } from "@components/hooks/useProfileSuggestions";
import { useSearchPlaces } from "@components/hooks/useSearchPlaces";
import { preloadSearchSuggestions } from "@components/ui/search/SearchSuggestionsLazy";
import { startNavigationFeedback } from "@lib/navigation-feedback";
import { sendSearchOutcomeGA, sendSuggestionSelectGA } from "@utils/analytics";
import {
  buildPlaceSearchIndex,
  suggestionDomId,
  suggestPlaces,
} from "@utils/search-query";
import type {
  SearchCombobox,
  SearchSuggestion,
  UseSearchComboboxOptions,
} from "types/search";

/**
 * APG combobox (list autocomplete) for a search box: "search events" for the
 * typed text, then matching places, then matching profiles. Focus stays in the
 * input; arrows move `aria-activedescendant`, Enter opens the active option or
 * falls back to the box's own submit. Nothing loads before the first focus.
 */
export function useSearchCombobox({
  value,
  setValue,
  context,
  onSubmit,
  onSelect,
}: UseSearchComboboxOptions): SearchCombobox {
  const router = useRouter();
  const listboxId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [activated, setActivated] = useState(false);
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Typing opens the list and clears the active option; a value set from the
  // URL while the box isn't focused doesn't open it.
  // (react.dev: "Adjusting some state when a prop changes").
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setActiveId(null);
    if (focused) setOpen(true);
  }

  const places = useSearchPlaces(activated);
  const placeIndex = buildPlaceSearchIndex(places);
  const { profiles, isLoading: profilesLoading } = useProfileSuggestions(value, activated);

  const query = value.trim();
  const suggestions: SearchSuggestion[] = query
    ? [
        { type: "events", id: "events", query },
        ...suggestPlaces(query, placeIndex).map((place) => ({
          type: "place" as const,
          id: `place:${place.value}`,
          place,
        })),
        ...profiles.map((profile) => ({
          type: "profile" as const,
          id: `profile:${profile.username}`,
          profile,
        })),
      ]
    : [];

  const isOpen = activated && open && suggestions.length > 0;
  // Ids stay valid when a group arrives late; an option that left the list
  // (a stale profile) can't be active.
  const activeSuggestion = isOpen
    ? (suggestions.find((suggestion) => suggestion.id === activeId) ?? null)
    : null;

  const close = () => {
    setOpen(false);
    setActiveId(null);
  };

  const dismiss = (abandoned = true) => {
    if (isOpen && abandoned) sendSearchOutcomeGA(context, "abandoned");
    close();
  };

  const select = (suggestion: SearchSuggestion) => {
    sendSuggestionSelectGA(
      context,
      suggestion.type,
      suggestions.indexOf(suggestion) + 1,
      query.length,
    );
    close();
    if (suggestion.type === "events") {
      onSelect(suggestion);
      return;
    }
    sendSearchOutcomeGA(context, suggestion.type);
    if (suggestion.type === "place") {
      onSelect(suggestion);
      return;
    }
    setValue("");
    startNavigationFeedback();
    router.push(`/perfil/${encodeURIComponent(suggestion.profile.username)}`);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enter or arrows that confirm an IME candidate (Japanese, Chinese...).
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (suggestions.length === 0) return;
        e.preventDefault();
        if (!isOpen) {
          setOpen(true);
          return;
        }
        const last = suggestions.length - 1;
        const index = suggestions.findIndex((s) => s.id === activeId);
        const next =
          e.key === "ArrowDown"
            ? index >= last ? 0 : index + 1
            : index <= 0 ? last : index - 1;
        setActiveId(suggestions[next].id);
        return;
      }
      case "Enter":
        e.preventDefault();
        if (activeSuggestion) {
          select(activeSuggestion);
          return;
        }
        close();
        onSubmit();
        return;
      case "Escape":
        // First Esc closes the list, a second one clears the text (without
        // navigating), like a native search field.
        if (isOpen) {
          e.preventDefault();
          dismiss();
        } else if (value) {
          e.preventDefault();
          setValue("");
        }
        return;
    }
  };

  const onFocus = () => {
    setFocused(true);
    if (!activated) {
      setActivated(true);
      preloadSearchSuggestions();
    }
  };

  // Tab or a click on another control. Taps on plain page areas don't blur on
  // iOS; the popup's outside-pointerdown handler covers those.
  const onBlur = () => {
    setFocused(false);
    close();
  };

  return {
    anchorRef,
    inputProps: {
      role: "combobox",
      "aria-autocomplete": "list",
      "aria-expanded": isOpen,
      "aria-controls": isOpen ? listboxId : undefined,
      "aria-activedescendant": activeSuggestion
        ? suggestionDomId(listboxId, activeSuggestion.id)
        : undefined,
      onFocus,
      onBlur,
      onKeyDown,
    },
    popupProps: activated
      ? {
          open: isOpen,
          anchorRef,
          listboxId,
          suggestions,
          activeId: activeSuggestion?.id ?? null,
          profilesLoading,
          onSelect: select,
          onDismiss: dismiss,
        }
      : null,
  };
}
