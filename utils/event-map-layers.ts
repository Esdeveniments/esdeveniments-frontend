import type {
  ExpressionSpecification,
  GeoJSONSourceSpecification,
  LayerSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import type { EventMapPoint, EventsMapColors } from "types/event-map";

// Style: OpenFreeMap (free, no key, commercial use OK), as on eltempsavui.cat.
export const EVENTS_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
export const EVENTS_MAP_SOURCE = "events";
export const EVENTS_MAP_MAX_ZOOM = 13;
const FONT = ["Noto Sans Bold"];
const WHITE = "#ffffff";

const isCluster: ExpressionSpecification = ["has", "point_count"];
const isKind = (kind: EventMapPoint["kind"]): ExpressionSpecification => [
  "all",
  ["!", isCluster],
  ["==", ["get", "kind"], kind],
];
// Selected (clicked) or hovered (pin or its row in the side panel).
const isActive: ExpressionSpecification = [
  "any",
  ["boolean", ["feature-state", "selected"], false],
  ["boolean", ["feature-state", "hover"], false],
];
const active = <T extends number | string>(on: T, off: T): ExpressionSpecification => [
  "case",
  isActive,
  on,
  off,
];
const countLabel = (prop: string, min: number): SymbolLayerSpecification["layout"] => ({
  "text-field": ["case", [">=", ["get", prop], min], ["to-string", ["get", prop]], ""],
  "text-font": FONT,
  "text-size": 12,
  "text-allow-overlap": true,
});

export function toEventsMapSource(points: EventMapPoint[]): GeoJSONSourceSpecification {
  return {
    type: "geojson",
    data: toFeatureCollection(points),
    cluster: true,
    clusterRadius: 44,
    clusterMaxZoom: EVENTS_MAP_MAX_ZOOM - 1,
    // Clusters show the number of events, not the number of markers.
    clusterProperties: { events: ["+", ["get", "count"]] },
    promoteId: "id",
  };
}

export function toFeatureCollection(points: EventMapPoint[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [point.lon, point.lat] },
      properties: { id: point.id, kind: point.kind, count: point.events.length, label: point.label },
    })),
  };
}

// Clusters and venues are solid brand dots; towns are white rings, so an
// event without a known venue never looks like an exact pin. The active pin
// fills in, grows and gets a halo; every pin is named (labels hide on overlap).
export function eventsMapLayers({ primary, ink }: EventsMapColors): LayerSpecification[] {
  const source = EVENTS_MAP_SOURCE;
  const townRadius: ExpressionSpecification = ["step", ["get", "count"], 13, 10, 16, 50, 20];
  const venueRadius: ExpressionSpecification = ["case", [">", ["get", "count"], 1], 12, 8];
  return [
    {
      id: "clusters",
      type: "circle",
      source,
      filter: isCluster,
      paint: {
        "circle-color": primary,
        "circle-opacity": 0.9,
        "circle-radius": ["step", ["get", "events"], 16, 10, 20, 50, 26],
        "circle-stroke-color": WHITE,
        "circle-stroke-width": 3,
      },
    },
    {
      id: "cluster-count",
      type: "symbol",
      source,
      filter: isCluster,
      layout: countLabel("events", 1),
      paint: { "text-color": WHITE },
    },
    {
      id: "active-halo",
      type: "circle",
      source,
      filter: ["!", isCluster],
      paint: {
        "circle-color": primary,
        "circle-opacity": active(0.22, 0),
        "circle-radius": ["+", ["case", ["==", ["get", "kind"], "town"], townRadius, venueRadius], 9],
      },
    },
    {
      id: "towns",
      type: "circle",
      source,
      filter: isKind("town"),
      paint: {
        "circle-color": active(primary, WHITE),
        "circle-radius": ["+", townRadius, active(3, 0)],
        "circle-stroke-color": active(WHITE, primary),
        "circle-stroke-width": active(3, 2.5),
      },
    },
    {
      id: "town-count",
      type: "symbol",
      source,
      filter: isKind("town"),
      layout: countLabel("count", 1),
      paint: { "text-color": active(WHITE, primary) },
    },
    {
      id: "venues",
      type: "circle",
      source,
      filter: isKind("venue"),
      paint: {
        "circle-color": primary,
        "circle-radius": ["+", venueRadius, active(3, 0)],
        "circle-stroke-color": WHITE,
        "circle-stroke-width": active(4, 2.5),
      },
    },
    {
      id: "venue-count",
      type: "symbol",
      source,
      filter: isKind("venue"),
      layout: countLabel("count", 2),
      paint: { "text-color": WHITE },
    },
    {
      id: "point-labels",
      type: "symbol",
      source,
      filter: ["!", isCluster],
      layout: {
        "text-field": ["get", "label"],
        "text-font": FONT,
        "text-size": 12,
        "text-anchor": "top",
        "text-offset": [0, 1.8],
        "text-max-width": 10,
        "text-optional": true,
      },
      paint: { "text-color": ink, "text-halo-color": WHITE, "text-halo-width": 1.5 },
    },
  ];
}

export const EVENTS_MAP_CLICK_LAYERS = ["clusters", "towns", "venues"];
