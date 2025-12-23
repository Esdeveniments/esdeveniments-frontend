"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { ListEvent } from "types/api/event";
import { isEventSummaryResponseDTO } from "types/api/isEventSummaryResponseDTO";
import Link from "next/link";
import NextImage from "next/image";
import { buildOptimizedImageUrl } from "@utils/image-cache";

// Fix default Leaflet icons in Next.js
const iconUrl = "/leaflet/marker-icon.png";
const iconRetinaUrl = "/leaflet/marker-icon-2x.png";
const shadowUrl = "/leaflet/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const geocodeMemoryCache = new Map<
  string,
  {
    status: "inflight" | "ok" | "fail";
    position?: [number, number];
    lastAttemptMs: number;
  }
>();

const GEOCODE_RETRY_AFTER_MS = 10 * 60 * 1000;

function toEventCoordQuery(event: Parameters<typeof isEventSummaryResponseDTO>[0]): string {
  if (!isEventSummaryResponseDTO(event)) return "";

  const parts = [event.location, event.city?.name, event.region?.name].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );

  return parts.join(", ");
}

function getEventLevelCoordinates(event: unknown): [number, number] | null {
  if (!event || typeof event !== "object") return null;
  const record = event as Record<string, unknown>;
  const lat = record.latitude;
  const lon = record.longitude;
  if (typeof lat === "number" && typeof lon === "number") {
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return [lat, lon];
    }
  }
  return null;
}

function MapInteractionTracker({
  onUserInteract,
}: {
  onUserInteract: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    const handler = () => onUserInteract();
    map.on("dragstart", handler);
    map.on("zoomstart", handler);
    map.on("movestart", handler);
    return () => {
      map.off("dragstart", handler);
      map.off("zoomstart", handler);
      map.off("movestart", handler);
    };
  }, [map, onUserInteract]);

  return null;
}

// Helper to fit map bounds (only once per dataset)
function MapBounds({
  fitKey,
  positions,
  disabled,
}: {
  fitKey: string;
  positions: Array<[number, number]>;
  disabled: boolean;
}) {
  const map = useMap();
  const lastFitKey = useRef<string | null>(null);

  useEffect(() => {
    if (disabled) return;
    if (positions.length === 0) return;
    if (lastFitKey.current === fitKey) return;

    lastFitKey.current = fitKey;
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [disabled, fitKey, map, positions]);

  return null;
}

export default function EventsMap({
  events,
  datasetKey,
}: {
  events: ListEvent[];
  datasetKey?: string;
}) {
  // Filter valid events
  const validEvents = useMemo(() =>
    events.filter(isEventSummaryResponseDTO).filter((e) => e.city?.latitude && e.city?.longitude),
    [events]);

  const [geocodedPositions, setGeocodedPositions] = useState<
    Record<string, [number, number] | null | undefined>
  >({});

  const [userInteracted, setUserInteracted] = useState(false);
  const [openPopupEventId, setOpenPopupEventId] = useState<string | null>(null);
  const fitKey = datasetKey ?? "default";

  useEffect(() => {
    let isCancelled = false;
    const abortController = new AbortController();

    const eventsToGeocode = validEvents.filter((event) => {
      // If backend already provides event-level coordinates, use them.
      if (getEventLevelCoordinates(event)) return false;

      const query = toEventCoordQuery(event);
      if (!query) return false;
      const cached = geocodeMemoryCache.get(query);
      if (cached?.status === "ok") return false;
      if (cached?.status === "inflight") return false;
      if (cached?.status === "fail") {
        const now = Date.now();
        if (now - cached.lastAttemptMs < GEOCODE_RETRY_AFTER_MS) return false;
      }
      if (geocodedPositions[event.id] !== undefined) return false;
      return true;
    });

    if (eventsToGeocode.length === 0) return;

    const geocode = async (eventId: string, query: string) => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`,
          { signal: abortController.signal }
        );
        if (!res.ok) {
          geocodeMemoryCache.set(query, {
            status: "fail",
            lastAttemptMs: Date.now(),
          });
          if (!isCancelled) {
            setGeocodedPositions((prev) => ({ ...prev, [eventId]: null }));
          }
          return;
        }

        const data: unknown = await res.json();
        if (!data || typeof data !== "object") {
          geocodeMemoryCache.set(query, {
            status: "fail",
            lastAttemptMs: Date.now(),
          });
          if (!isCancelled) {
            setGeocodedPositions((prev) => ({ ...prev, [eventId]: null }));
          }
          return;
        }

        const record = data as Record<string, unknown>;
        const lat = record.lat;
        const lon = record.lon;

        if (
          typeof lat === "number" &&
          typeof lon === "number" &&
          Number.isFinite(lat) &&
          Number.isFinite(lon)
        ) {
          const position: [number, number] = [lat, lon];
          geocodeMemoryCache.set(query, {
            status: "ok",
            position,
            lastAttemptMs: Date.now(),
          });
          if (!isCancelled) {
            setGeocodedPositions((prev) => ({ ...prev, [eventId]: position }));
          }
          return;
        }

        geocodeMemoryCache.set(query, {
          status: "fail",
          lastAttemptMs: Date.now(),
        });
        if (!isCancelled) {
          setGeocodedPositions((prev) => ({ ...prev, [eventId]: null }));
        }
      } catch {
        geocodeMemoryCache.set(query, {
          status: "fail",
          lastAttemptMs: Date.now(),
        });
        if (!isCancelled) {
          setGeocodedPositions((prev) => ({ ...prev, [eventId]: null }));
        }
      }
    };

    // Fire requests with minimal parallelism to avoid rate limits.
    // (Simple serial loop keeps things predictable.)
    (async () => {
      for (const event of eventsToGeocode) {
        const query = toEventCoordQuery(event);
        if (!query) continue;
        const now = Date.now();
        const cached = geocodeMemoryCache.get(query);
        if (cached?.status === "ok") continue;
        if (cached?.status === "inflight") continue;
        if (cached?.status === "fail" && now - cached.lastAttemptMs < GEOCODE_RETRY_AFTER_MS) continue;

        // Mark as "in-flight" to avoid duplicate calls.
        geocodeMemoryCache.set(query, {
          status: "inflight",
          lastAttemptMs: now,
        });
        await geocode(event.id, query);
      }
    })();

    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [validEvents, geocodedPositions]);

  useEffect(() => {
    // New dataset (filters changed): allow one auto-fit again.
    setUserInteracted(false);
  }, [fitKey]);

  const markerPositions = validEvents
    .map((event): [number, number] | null => {
      const eventLevel = getEventLevelCoordinates(event);
      if (eventLevel) return eventLevel;

      const query = toEventCoordQuery(event);
      if (query) {
        const cached = geocodeMemoryCache.get(query);
        if (cached?.status === "ok" && cached.position) return cached.position;
        const state = geocodedPositions[event.id];
        if (state) return state;
      }

      return event.city ? [event.city.latitude, event.city.longitude] : null;
    })
    .filter((p): p is [number, number] => Array.isArray(p));

  // Freeze positions per dataset to avoid refitting when data increments.
  const [fitState, setFitState] = useState<{
    key: string;
    positions: Array<[number, number]>;
  }>({
    key: fitKey,
    positions: markerPositions,
  });

  useEffect(() => {
    setFitState((prev) => {
      if (prev.key === fitKey) return prev;
      return { key: fitKey, positions: markerPositions };
    });
    // Only reset when dataset key changes; ignore marker updates (geocodes).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  if (validEvents.length === 0) return null;

  // Center on first event or default to Catalunya
  const defaultCenter: [number, number] = validEvents[0]?.city
    ? [validEvents[0].city.latitude, validEvents[0].city.longitude]
    : [41.3851, 2.1734];

  return (
    // Z-index 0 to ensure it doesn't overlap modals/menus
    <div
      className="w-full h-[500px] rounded-card overflow-hidden border border-border z-0 relative"
      data-testid="events-map"
    >
      <MapContainer
        center={defaultCenter}
        zoom={1}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validEvents.map((event) => {
          const eventLevel = getEventLevelCoordinates(event);
          const query = toEventCoordQuery(event);
          const geocoded = query ? geocodeMemoryCache.get(query) : null;
          const statePosition = geocodedPositions[event.id] ?? null;

          const position: [number, number] =
            eventLevel ??
            (geocoded?.status === "ok" && geocoded.position ? geocoded.position : null) ??
            statePosition ??
            [event.city!.latitude, event.city!.longitude];

          return (
            <Marker
              key={event.id}
              position={position}
              eventHandlers={{
                popupopen: () => setOpenPopupEventId(event.id),
                popupclose: () => setOpenPopupEventId((prev) => (prev === event.id ? null : prev)),
              }}
            >
              <Popup className="min-w-[200px]">
                <div className="flex flex-col gap-2">
                  {event.imageUrl && openPopupEventId === event.id && (
                    <div className="relative w-full h-24 rounded-input bg-muted overflow-hidden">
                      <NextImage
                        src={buildOptimizedImageUrl(event.imageUrl)}
                        alt={event.title}
                        fill
                        className="object-cover"
                        sizes="200px"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div>
                    <Link
                      href={`/e/${event.slug}`}
                      className="font-bold text-primary hover:underline text-sm block leading-tight"
                    >
                      {event.title}
                    </Link>
                    <span className="text-xs text-foreground/70 block mt-1">
                      {event.formattedStart}
                    </span>
                    <span className="text-xs text-foreground block font-medium">
                      {event.location}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Track popup open/close so we don't preload all images */}
        <MapInteractionTracker
          onUserInteract={() => {
            setUserInteracted(true);
          }}
        />
        <MapBounds fitKey={fitState.key} positions={fitState.positions} disabled={userInteracted} />
      </MapContainer>
    </div>
  );
}


