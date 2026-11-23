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
import { prefersReducedMotion } from "@utils/browser";
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

const motion = () => (prefersReducedMotion() ? 0 : 500);

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
  const [readyMap, setReadyMap] = useState<MapLibre | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const status: EventsMapStatus = loadFailed
    ? "error"
    : readyMap
      ? "ready"
      : "loading";

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
    let disposed = false;
    let loaded = false;
    let failed = false;
    let map: MapLibre | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fail = (reason: EventsMapLoadFailure) => {
      if (disposed || loaded || failed) return;
      failed = true;
      setLoadFailed(true);
      sendGoogleEvent("map_load_error", { reason });
    };
    const cleanup = () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      mapRef.current = null;
      // Under React <Activity> (router cache), effects unmount while state
      // survives; clearing readyMap/loadFailed resets status and prevents
      // same-commit effects from touching a freshly created, unloaded map.
      setReadyMap(null);
      setLoadFailed(false);
      map?.remove();
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
      return cleanup;
    }
    const activeMap = map;
    mapRef.current = activeMap;
    activeMap.touchZoomRotate.disableRotation();
    activeMap.addControl(new NavigationControl({ showCompass: false }), "top-right");
    activeMap.addControl(new GeolocateControl({ fitBoundsOptions: { maxZoom: EVENTS_MAP_MAX_ZOOM } }), "top-right");

    timer = setTimeout(() => fail("timeout"), LOAD_TIMEOUT_MS);
    const featureAt = ({ x, y }: { x: number; y: number }) => {
      // Our layers exist only after "load"; querying them earlier fires an
      // "error" event, which would show the error screen on a hover.
      if (!loaded) return undefined;
      const box: [PointLike, PointLike] = [[x - HIT_PX, y - HIT_PX], [x + HIT_PX, y + HIT_PX]];
      return activeMap.queryRenderedFeatures(box, { layers: EVENTS_MAP_CLICK_LAYERS })[0];
    };

    activeMap.on("load", () => {
      if (disposed || mapRef.current !== activeMap) return;
      loaded = true;
      if (timer) clearTimeout(timer);
      // The container is `text-primary` inside a `text-foreground` wrapper:
      // the design tokens without hex copies.
      const colors = {
        primary: getComputedStyle(container).color,
        ink: getComputedStyle(container.parentElement ?? container).color,
      };
      activeMap.addSource(EVENTS_MAP_SOURCE, toEventsMapSource(pointsRef.current));
      for (const layer of eventsMapLayers(colors)) activeMap.addLayer(layer);
      setLoadFailed(false);
      setReadyMap(activeMap);
    });
    activeMap.on("error", (event) => {
      if (disposed || mapRef.current !== activeMap) return;
      if (!("sourceId" in event)) fail("error");
    });
    let hovered: string | null = null;
    const setHovered = (id: string | null) => {
      if (id === hovered) return;
      hovered = id;
      onHoverRef.current(id);
    };
    activeMap.on("mousemove", (event) => {
      const feature = featureAt(event.point);
      activeMap.getCanvas().style.cursor = feature ? "pointer" : "";
      setHovered(feature && feature.properties?.cluster_id == null ? String(feature.properties?.id) : null);
    });
    activeMap.on("mouseout", () => setHovered(null));
    activeMap.on("click", async (event) => {
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
      const source = activeMap.getSource<GeoJSONSource>(EVENTS_MAP_SOURCE);
      const zoom = await source?.getClusterExpansionZoom(clusterId);
      if (zoom != null && mapRef.current === activeMap) activeMap.easeTo({ center, zoom, duration: motion() });
    });

    return cleanup;
    // uiStrings only matter at creation; a locale change remounts the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load more / filters: new data in place. Refit only if nothing is in view.
  useEffect(() => {
    if (!readyMap || mapRef.current !== readyMap) return;
    readyMap.getSource<GeoJSONSource>(EVENTS_MAP_SOURCE)?.setData(toFeatureCollection(points));
    const view = readyMap.getBounds();
    if (points.length && !points.some((p) => view.contains([p.lon, p.lat]))) fitAll();
  }, [points, readyMap, fitAll]);

  useEffect(() => {
    if (!readyMap || mapRef.current !== readyMap || !selectedId) return;
    const target = { source: EVENTS_MAP_SOURCE, id: selectedId };
    readyMap.setFeatureState(target, { selected: true });
    return () => {
      if (mapRef.current === readyMap) readyMap.removeFeatureState(target, "selected");
    };
  }, [selectedId, readyMap]);

  // Mobile: the bottom sheet covers the map, so camera moves centre above it.
  // Selecting a place grows the sheet; pan only if that hides its pin. Wait
  // for a running move (the panel's focus()) so the two don't fight.
  useEffect(() => {
    if (!readyMap || mapRef.current !== readyMap) return;
    const apply = () => {
      readyMap.setPadding({ top: 0, right: 0, left: 0, bottom: insetBottom });
      const point = pointsRef.current.find((p) => p.id === selectedIdRef.current);
      if (!point) return;
      const center: [number, number] = [point.lon, point.lat];
      const { y } = readyMap.project(center);
      if (y < HIT_PX || y > readyMap.getContainer().clientHeight - insetBottom - HIT_PX) {
        readyMap.easeTo({ center, duration: motion() });
      }
    };
    if (!readyMap.isMoving()) return apply();
    readyMap.once("moveend", apply);
    return () => {
      readyMap.off("moveend", apply);
    };
  }, [insetBottom, readyMap]);

  useEffect(() => {
    if (!readyMap || mapRef.current !== readyMap || !hoveredId) return;
    const target = { source: EVENTS_MAP_SOURCE, id: hoveredId };
    readyMap.setFeatureState(target, { hover: true });
    return () => {
      if (mapRef.current === readyMap) readyMap.removeFeatureState(target, "hover");
    };
  }, [hoveredId, readyMap]);

  return { containerRef, status, fitAll, focus };
}
