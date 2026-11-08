"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GeolocateControl,
  getVersion,
  LngLatBounds,
  Map as MapLibre,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type PointLike,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { sendGoogleEvent } from "@utils/analytics";
import {
  EVENTS_MAP_CLICK_LAYERS,
  EVENTS_MAP_MAX_ZOOM,
  EVENTS_MAP_SOURCE,
  EVENTS_MAP_STYLE,
  eventsMapLayers,
  toEventsMapSource,
  toFeatureCollection,
} from "@utils/event-map-layers";
import type {
  EventMapPoint,
  EventsMapLoadFailure,
  EventsMapStatus,
  UseEventsMapLibreInput,
} from "types/event-map";

// Self-hosted by scripts/copy-maplibre-worker.mjs (same origin for the CSP).
setWorkerUrl(`/static/maplibre-v${getVersion()}/maplibre-gl-worker.mjs`);

const LOAD_TIMEOUT_MS = 12_000;
// Fuzzy hit area so small dots are easy to tap (~44 px target).
const HIT_PX = 16;
const PADDING = 48;

const motion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500;

const boundsOf = (points: EventMapPoint[]) =>
  points.reduce((b, p) => b.extend([p.lon, p.lat]), new LngLatBounds());

export function useEventsMapLibre({
  points,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  insetBottom,
  uiStrings,
}: UseEventsMapLibreInput) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const pointsRef = useRef(points);
  const selectedIdRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  const [status, setStatus] = useState<EventsMapStatus>("loading");

  useEffect(() => {
    pointsRef.current = points;
    selectedIdRef.current = selectedId;
    onSelectRef.current = onSelect;
    onHoverRef.current = onHover;
  });

  const fitAll = useCallback(() => {
    const map = mapRef.current;
    const pts = pointsRef.current;
    if (!map || pts.length === 0) return;
    map.fitBounds(boundsOf(pts), { padding: PADDING, maxZoom: EVENTS_MAP_MAX_ZOOM, duration: motion() });
  }, []);

  const focus = useCallback((point: EventMapPoint) => {
    const map = mapRef.current;
    if (!map) return;
    const zoom = Math.max(map.getZoom(), point.kind === "venue" ? 15 : EVENTS_MAP_MAX_ZOOM);
    map.easeTo({ center: [point.lon, point.lat], zoom, duration: motion() });
  }, []);

  // Create the map once; data and selection updates go through the effects below.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let loaded = false;
    let failed = false;
    let map: MapLibre;
    const fail = (reason: EventsMapLoadFailure) => {
      if (loaded || failed) return;
      failed = true;
      setStatus("error");
      sendGoogleEvent("map_load_error", { reason });
    };
    try {
      map = new MapLibre({
        container,
        style: EVENTS_MAP_STYLE,
        bounds: pointsRef.current.length ? boundsOf(pointsRef.current) : undefined,
        fitBoundsOptions: { padding: PADDING, maxZoom: EVENTS_MAP_MAX_ZOOM },
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        locale: uiStrings,
      });
    } catch {
      fail("init");
      return;
    }
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new GeolocateControl({ fitBoundsOptions: { maxZoom: EVENTS_MAP_MAX_ZOOM } }), "top-right");

    const timer = setTimeout(() => fail("timeout"), LOAD_TIMEOUT_MS);
    const featureAt = ({ x, y }: { x: number; y: number }) => {
      // Our layers exist only after "load"; querying them earlier fires an
      // "error" event, which would show the error screen on a hover.
      if (!loaded) return undefined;
      const box: [PointLike, PointLike] = [[x - HIT_PX, y - HIT_PX], [x + HIT_PX, y + HIT_PX]];
      return map.queryRenderedFeatures(box, { layers: EVENTS_MAP_CLICK_LAYERS })[0];
    };

    map.on("load", () => {
      loaded = true;
      clearTimeout(timer);
      // The container is `text-primary` inside a `text-foreground` wrapper:
      // the design tokens without hex copies.
      const colors = {
        primary: getComputedStyle(container).color,
        ink: getComputedStyle(container.parentElement ?? container).color,
      };
      map.addSource(EVENTS_MAP_SOURCE, toEventsMapSource(pointsRef.current));
      for (const layer of eventsMapLayers(colors)) map.addLayer(layer);
      setStatus("ready");
    });
    map.on("error", (event) => {
      if (!("sourceId" in event)) fail("error");
    });
    let hovered: string | null = null;
    const setHovered = (id: string | null) => {
      if (id === hovered) return;
      hovered = id;
      onHoverRef.current(id);
    };
    map.on("mousemove", (event) => {
      const feature = featureAt(event.point);
      map.getCanvas().style.cursor = feature ? "pointer" : "";
      setHovered(feature && feature.properties?.cluster_id == null ? String(feature.properties?.id) : null);
    });
    map.on("mouseout", () => setHovered(null));
    map.on("click", async (event) => {
      const feature = featureAt(event.point);
      if (!feature || feature.geometry.type !== "Point") return;
      const center = feature.geometry.coordinates as [number, number];
      const clusterId = feature.properties?.cluster_id;
      sendGoogleEvent("map_pin_click", {
        source: clusterId == null ? String(feature.properties?.kind) : "cluster",
      });
      if (clusterId == null) {
        onSelectRef.current(String(feature.properties?.id));
        return;
      }
      const source = map.getSource<GeoJSONSource>(EVENTS_MAP_SOURCE);
      const zoom = await source?.getClusterExpansionZoom(clusterId);
      if (zoom != null && mapRef.current === map) map.easeTo({ center, zoom, duration: motion() });
    });

    return () => {
      clearTimeout(timer);
      mapRef.current = null;
      map.remove();
    };
    // uiStrings only matter at creation; a locale change remounts the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load more / filters: new data in place. Refit only if nothing is in view.
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map) return;
    map.getSource<GeoJSONSource>(EVENTS_MAP_SOURCE)?.setData(toFeatureCollection(points));
    const view = map.getBounds();
    if (points.length && !points.some((p) => view.contains([p.lon, p.lat]))) fitAll();
  }, [points, status, fitAll]);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || !selectedId) return;
    const target = { source: EVENTS_MAP_SOURCE, id: selectedId };
    map.setFeatureState(target, { selected: true });
    return () => {
      if (mapRef.current === map) map.removeFeatureState(target, "selected");
    };
  }, [selectedId, status]);

  // Mobile: the bottom sheet covers the map, so camera moves centre above it.
  // Selecting a place grows the sheet; pan only if that hides its pin. Wait
  // for a running move (the panel's focus()) so the two don't fight.
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map) return;
    const apply = () => {
      map.setPadding({ top: 0, right: 0, left: 0, bottom: insetBottom });
      const point = pointsRef.current.find((p) => p.id === selectedIdRef.current);
      if (!point) return;
      const center: [number, number] = [point.lon, point.lat];
      const { y } = map.project(center);
      if (y < HIT_PX || y > map.getContainer().clientHeight - insetBottom - HIT_PX) {
        map.easeTo({ center, duration: motion() });
      }
    };
    if (!map.isMoving()) return apply();
    map.once("moveend", apply);
    return () => {
      map.off("moveend", apply);
    };
  }, [insetBottom, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || !hoveredId) return;
    const target = { source: EVENTS_MAP_SOURCE, id: hoveredId };
    map.setFeatureState(target, { hover: true });
    return () => {
      if (mapRef.current === map) map.removeFeatureState(target, "hover");
    };
  }, [hoveredId, status]);

  return { containerRef, status, fitAll, focus };
}
