"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import Button from "@components/ui/common/button";
import { useListingEvents } from "@components/context/ListingEventsContext";
import { buildEventMapPoints } from "@utils/event-map";
import EventsMapPanel from "./EventsMapPanel";
import { useEventsMapLibre } from "./useEventsMapLibre";
import type { EventMapPoint, EventsMapProps } from "types/event-map";

// Loaded only when the map opens (next/dynamic in EventsMapToggle), so
// maplibre-gl and its CSS never reach the listing's initial bundle.
// Desktop: places/events column + map. Mobile: full map with a bottom sheet.
function EventsMapView({ onRetry }: EventsMapProps) {
  const t = useTranslations("Components.EventsMap");
  const { events, isLoading } = useListingEvents();
  const points = useMemo(() => buildEventMapPoints(events), [events]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [insetBottom, setInsetBottom] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  // A selection that left the data (filters, navigation) clears itself.
  const selected = points.find((p) => p.id === selectedId) ?? null;

  // On mobile the sheet floats over the map: tell the camera how much it hides.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const observer = new ResizeObserver(() => {
      setInsetBottom(getComputedStyle(sheet).position === "absolute" ? sheet.offsetHeight : 0);
    });
    observer.observe(sheet);
    return () => observer.disconnect();
  }, []);

  const uiStrings = useMemo(
    () => ({
      "Map.Title": t("mapTitle"),
      "NavigationControl.ZoomIn": t("zoomIn"),
      "NavigationControl.ZoomOut": t("zoomOut"),
      "GeolocateControl.FindMyLocation": t("findMyLocation"),
      "GeolocateControl.LocationNotAvailable": t("locationNotAvailable"),
      "AttributionControl.ToggleAttribution": t("toggleAttribution"),
    }),
    [t],
  );
  const { containerRef, status, fitAll, focus } = useEventsMapLibre({
    points,
    selectedId: selected?.id ?? null,
    hoveredId,
    onSelect: setSelectedId,
    onHover: setHoveredId,
    insetBottom,
    uiStrings,
  });

  const selectFromPanel = (point: EventMapPoint | null) => {
    setSelectedId(point?.id ?? null);
    setHoveredId(null);
    if (point) focus(point);
  };

  const overlay =
    status === "error" ? (
      <div className="stack items-center gap-2 text-center">
        <p className="body-small text-foreground">{t("error")}</p>
        <Button variant="outline" className="btn-sm" onClick={onRetry}>
          {t("retry")}
        </Button>
      </div>
    ) : status === "loading" || isLoading ? (
      <p className="body-small text-muted-foreground">{t("loading")}</p>
    ) : points.length === 0 ? (
      <p className="body-small text-foreground">{t("empty")}</p>
    ) : null;

  return (
    <div className="relative h-full lg:flex">
      <div
        className="events-map absolute inset-0 bg-muted text-foreground lg:relative lg:order-2 lg:flex-1 lg:min-w-0"
        style={{ "--events-map-inset": `${insetBottom}px` } as CSSProperties}
      >
        {/* maplibre-gl.css makes .maplibregl-map position: relative, so size it with h-full, not inset-0. */}
        <div ref={containerRef} className="h-full w-full text-primary" />
        {overlay ? (
          <div
            className={`absolute inset-0 flex-center p-4 bg-background/70 ${status === "error" ? "" : "pointer-events-none"}`}
          >
            {overlay}
          </div>
        ) : null}
        <Button
          variant="neutral"
          className="btn-sm absolute top-3 left-3 bg-background shadow-md"
          disabled={status !== "ready" || points.length === 0}
          onClick={() => {
            setSelectedId(null);
            fitAll();
          }}
        >
          {t("showAll")}
        </Button>
      </div>
      <div
        ref={sheetRef}
        className="events-map-sheet absolute inset-x-0 bottom-0 pointer-events-none lg:static lg:order-1 lg:w-2/5 xl:w-1/3 lg:p-0 lg:overflow-y-auto lg:border-r lg:border-border lg:pointer-events-auto"
      >
        <div className="card-elevated p-card-padding pointer-events-auto lg:shadow-none lg:rounded-none">
          <EventsMapPanel
            points={points}
            selected={selected}
            hoveredId={hoveredId}
            onSelect={selectFromPanel}
            onHover={setHoveredId}
          />
        </div>
      </div>
    </div>
  );
}

// Retry remounts the view, which recreates the map from scratch.
export default function EventsMap() {
  const [attempt, setAttempt] = useState(0);
  return <EventsMapView key={attempt} onRetry={() => setAttempt((n) => n + 1)} />;
}
