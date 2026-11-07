"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import SearchSuggestionOption from "@components/ui/search/SearchSuggestionOption";
import { suggestionDomId } from "@utils/search-query";
import type { SearchSuggestion, SearchSuggestionsProps } from "types/search";

const GAP_PX = 4;
const MIN_HEIGHT_PX = 120;

/**
 * The listbox of a search combobox (see `useSearchCombobox`). Portaled to
 * `document.body` with `position: fixed`, so the hero's `overflow-hidden`
 * can't clip it, and capped to the visual viewport so the last option stays
 * reachable above a mobile keyboard. Focus never leaves the input.
 */
export default function SearchSuggestions({
  open,
  anchorRef,
  listboxId,
  suggestions,
  activeId,
  profilesLoading,
  onSelect,
  onDismiss,
}: SearchSuggestionsProps) {
  const t = useTranslations("Components.SearchBar.suggestions");
  const popupRef = useRef<HTMLDivElement>(null);

  // Follow the anchor on scroll, resize and keyboard show/hide. Writes styles
  // directly: a re-render per scroll frame would be wasted work.
  useLayoutEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    let frame = 0;
    const place = () => {
      frame = 0;
      const anchor = anchorRef.current;
      const popup = popupRef.current;
      if (!anchor || !popup) return;
      const rect = anchor.getBoundingClientRect();
      const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      const top = rect.bottom + GAP_PX;
      popup.style.top = `${top}px`;
      popup.style.left = `${rect.left}px`;
      popup.style.width = `${rect.width}px`;
      popup.style.maxHeight = `${Math.max(MIN_HEIGHT_PX, bottom - top - 2 * GAP_PX)}px`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };
    place();
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    // The listing's sticky bar keeps sliding after the scroll stops.
    document.addEventListener("transitionend", schedule, true);
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      document.removeEventListener("transitionend", schedule, true);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
    };
  }, [open, anchorRef]);

  // iOS doesn't blur the input on taps outside focusable elements.
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      dismissRef.current(!(target instanceof Element && target.closest("[data-search-submit]")));
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open || !activeId) return;
    document
      .getElementById(suggestionDomId(listboxId, activeId))
      ?.scrollIntoView?.({ block: "nearest" });
  }, [open, activeId, listboxId]);

  const groups = {
    events: suggestions.filter((s) => s.type === "events"),
    place: suggestions.filter((s) => s.type === "place"),
    profile: suggestions.filter((s) => s.type === "profile"),
  };

  const renderOption = (suggestion: SearchSuggestion) => (
    <SearchSuggestionOption
      key={suggestion.id}
      suggestion={suggestion}
      domId={suggestionDomId(listboxId, suggestion.id)}
      active={suggestion.id === activeId}
      onSelect={onSelect}
    />
  );

  const renderGroup = (key: "place" | "profile", items: SearchSuggestion[]) => {
    if (items.length === 0) return null;
    const labelId = `${listboxId}-${key}-label`;
    return (
      <div role="group" aria-labelledby={labelId} className="border-t border-border pt-2 mt-2">
        <div id={labelId} className="px-4 pb-1 body-small font-semibold text-muted-foreground">
          {t(key === "place" ? "places" : "profiles")}
        </div>
        {items.map(renderOption)}
      </div>
    );
  };

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite">
        {open ? t("count", { count: suggestions.length }) : ""}
      </div>
      {open &&
        createPortal(
          <div
            ref={popupRef}
            // Keeps focus (and the mobile keyboard) in the input on tap.
            onMouseDown={(e) => e.preventDefault()}
            className="fixed z-dropdown overflow-y-auto overscroll-contain rounded-card bg-background border border-border shadow-dropdown py-2"
            data-testid="search-suggestions"
          >
            <div role="listbox" id={listboxId} aria-label={t("label")}>
              {groups.events.map(renderOption)}
              {renderGroup("place", groups.place)}
              {renderGroup("profile", groups.profile)}
            </div>
            {profilesLoading && (
              <div aria-hidden="true" className="px-4 pt-2 body-small text-muted-foreground">
                {t("loadingProfiles")}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
