"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import CompactCardClient from "@components/ui/common/cardContent/CompactCardClient";
import { comparePlaceNames } from "@utils/string-helpers";
import type { EventsMapPanelProps } from "types/props";
import type { AppLocale } from "types/i18n";

const ICON_BUTTON =
  "flex-center flex-none h-button w-button rounded-button bg-background text-foreground hover:bg-muted focus-ring";

// Desktop: the left column next to the map. Mobile: a sheet over the bottom
// of the map. Lists the places (the keyboard way to pick one; hovering a row
// lights its pin) or the events of the selected place.
export default function EventsMapPanel({
  points,
  selected,
  hoveredId,
  onSelect,
  onHover,
}: EventsMapPanelProps) {
  const t = useTranslations("Components.EventsMap");
  const tCard = useTranslations("Components.CardContent");
  const locale = useLocale() as AppLocale;
  const headingId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const lastSelectedIdRef = useRef<string | null>(null);
  const selectedId = selected?.id ?? null;

  // Picking a place (or going back) swaps this panel's content and drops the
  // focused button. Keep keyboard focus in the panel: on Back after a pick,
  // on the place button after Back. A pin click elsewhere keeps its focus.
  useEffect(() => {
    const root = rootRef.current;
    const active = document.activeElement;
    const previousId = lastSelectedIdRef.current;
    lastSelectedIdRef.current = selectedId;
    if (!root || (active && active !== document.body && !root.contains(active))) return;
    const target = selectedId
      ? root.querySelector<HTMLElement>("[data-panel-back]")
      : previousId
        ? root.querySelector<HTMLElement>(`[data-place-id="${CSS.escape(previousId)}"]`)
        : null;
    target?.focus({ preventScroll: true });
  }, [selectedId]);

  const places = useMemo(
    () =>
      [...points].sort(
        (a, b) =>
          b.events.length - a.events.length ||
          comparePlaceNames(a.label, b.label, locale),
      ),
    [points, locale],
  );

  if (selected) {
    return (
      <section ref={rootRef} aria-labelledby={headingId} className="stack gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-panel-back
            className={ICON_BUTTON}
            aria-label={t("back")}
            onClick={() => onSelect(null)}
          >
            <ArrowLeftIcon className="w-5 h-5" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <h3 id={headingId} className="heading-4 text-foreground-strong truncate">
              {selected.label}
            </h3>
            <p className="body-small text-muted-foreground">
              {t("eventsCount", { count: selected.events.length })}
            </p>
          </div>
        </div>
        {selected.kind === "town" ? (
          <p className="text-xs text-muted-foreground">{t("townNote")}</p>
        ) : null}
        {/* Mobile: one swipeable row. Desktop: wraps into the column. */}
        <div
          role="list"
          aria-labelledby={headingId}
          className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 lg:flex-wrap lg:overflow-visible"
        >
          {selected.events.map((event, index) => (
            <div role="listitem" key={event.id} className="snap-start flex-none">
              <CompactCardClient
                event={event}
                locale={locale}
                tCard={tCard}
                index={index}
                analyticsEventName="map_event_click"
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const mappedCount = points.reduce((sum, p) => sum + p.events.length, 0);
  return (
    <section ref={rootRef} aria-labelledby={headingId} className="stack gap-2">
      <h3 id={headingId} className="body-small font-semibold text-foreground-strong">
        {t("mappedCount", { count: mappedCount })}
      </h3>
      <p className="sr-only lg:not-sr-only text-xs text-muted-foreground">{t("hint")}</p>
      <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {places.map((point) => (
          <li key={point.id} className="flex-none">
            <button
              type="button"
              data-place-id={point.id}
              aria-label={t("placeOption", { label: point.label, count: point.events.length })}
              onClick={() => onSelect(point)}
              onMouseEnter={() => onHover(point.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(point.id)}
              onBlur={() => onHover(null)}
              className={`flex items-center gap-2 w-full min-h-button px-badge-x rounded-badge lg:rounded-input border body-small text-left transition-interactive focus-ring hover:bg-muted ${
                hoveredId === point.id ? "border-primary bg-muted" : "border-border bg-background"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex-none w-3 h-3 rounded-full ${
                  point.kind === "venue" ? "bg-primary" : "bg-background border-2 border-primary"
                }`}
              />
              <span className="whitespace-nowrap text-foreground lg:flex-1 lg:truncate">
                {point.label}
              </span>
              <span className="text-muted-foreground">{point.events.length}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="w-3 h-3 rounded-full bg-primary" />
          {t("legendVenue")}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="w-3 h-3 rounded-full bg-background border-2 border-primary" />
          {t("legendTown")}
        </span>
      </div>
    </section>
  );
}
