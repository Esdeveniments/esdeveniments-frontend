import { Activity } from "react";
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UseEventsMapLibreInput } from "types/event-map";

const { sendGoogleEvent, maps } = vi.hoisted(() => ({
  sendGoogleEvent: vi.fn(),
  maps: [] as Array<{
    fire: (type: string, event?: unknown) => Promise<void>;
    feature: unknown;
    setFeatureState: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock("@utils/analytics", () => ({ sendGoogleEvent }));
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));
vi.mock("maplibre-gl", () => {
  class FakeMap {
    handlers = new Map<string, Array<(event?: unknown) => unknown>>();
    feature: unknown = undefined;
    loaded = false;
    touchZoomRotate = { disableRotation: () => {} };
    setFeatureState = vi.fn(() => {
      if (!this.loaded) throw new Error("Style is not done loading.");
    });
    constructor() {
      maps.push(this);
    }
    on(type: string, handler: (event?: unknown) => unknown) {
      this.handlers.set(type, [...(this.handlers.get(type) ?? []), handler]);
    }
    async fire(type: string, event?: unknown) {
      if (type === "load") this.loaded = true;
      for (const handler of this.handlers.get(type) ?? []) await handler(event);
    }
    addControl() {}
    addSource() {}
    addLayer() {}
    remove() {}
    removeFeatureState() {}
    getCanvas() {
      return { style: {} };
    }
    queryRenderedFeatures() {
      return this.feature ? [this.feature] : [];
    }
    getSource() {
      return { getClusterExpansionZoom: async () => null, setData: () => {} };
    }
    getBounds() {
      return { contains: () => true };
    }
    setPadding() {}
    isMoving() {
      return false;
    }
  }
  class LngLatBounds {
    extend() {
      return this;
    }
  }
  return {
    Map: FakeMap,
    LngLatBounds,
    NavigationControl: class {},
    GeolocateControl: class {},
    getVersion: () => "0",
    setWorkerUrl: () => {},
  };
});

const { useEventsMapLibre } = await import("@components/ui/eventsMap/useEventsMapLibre");

const input: UseEventsMapLibreInput = {
  points: [],
  selectedId: null,
  hoveredId: null,
  onSelect: () => {},
  onHover: () => {},
  insetBottom: 0,
  uiStrings: {},
};

function Harness({ selectedId = null }: { selectedId?: string | null }) {
  const { containerRef } = useEventsMapLibre({ ...input, selectedId });
  return <div ref={containerRef} />;
}

const pin = (properties: Record<string, unknown>) => ({
  geometry: { type: "Point", coordinates: [2, 41] },
  properties,
});

describe("events map analytics", () => {
  beforeEach(() => {
    sendGoogleEvent.mockClear();
    maps.length = 0;
  });

  it("reports a load failure once, with its reason", async () => {
    vi.useFakeTimers();
    render(<Harness />);
    await act(() => maps[0].fire("error", {}));
    await act(() => maps[0].fire("error", {}));
    act(() => vi.runAllTimers());
    vi.useRealTimers();

    expect(sendGoogleEvent).toHaveBeenCalledTimes(1);
    expect(sendGoogleEvent).toHaveBeenCalledWith("map_load_error", { reason: "error" });
  });

  it("ignores tile errors and failures after the map loaded", async () => {
    render(<Harness />);
    await act(() => maps[0].fire("error", { sourceId: "openmaptiles" }));
    await act(() => maps[0].fire("load"));
    await act(() => maps[0].fire("error", {}));

    expect(sendGoogleEvent).not.toHaveBeenCalled();
  });

  it("reports pin clicks by type", async () => {
    render(<Harness />);
    const map = maps[0];
    await act(() => map.fire("load"));

    map.feature = pin({ id: "town:cardedeu", kind: "town" });
    await act(() => map.fire("click", { point: { x: 1, y: 1 } }));
    map.feature = pin({ cluster_id: 7 });
    await act(() => map.fire("click", { point: { x: 1, y: 1 } }));

    expect(sendGoogleEvent.mock.calls).toEqual([
      ["map_pin_click", { source: "town" }],
      ["map_pin_click", { source: "cluster" }],
    ]);
  });

  it("waits for the restored map to load after Activity hide/show before setting feature state", async () => {
    const { rerender } = render(
      <Activity mode="visible">
        <Harness selectedId="town:cardedeu" />
      </Activity>,
    );
    await act(() => maps[0].fire("load"));
    expect(maps[0].setFeatureState).toHaveBeenCalledTimes(1);

    // Hide (router cache): effect cleanup destroys maps[0] while state survives.
    rerender(
      <Activity mode="hidden">
        <Harness selectedId="town:cardedeu" />
      </Activity>,
    );

    // Restore: creates maps[1] (unloaded). Must not call setFeatureState until load.
    rerender(
      <Activity mode="visible">
        <Harness selectedId="town:cardedeu" />
      </Activity>,
    );
    expect(maps).toHaveLength(2);
    expect(maps[1].setFeatureState).not.toHaveBeenCalled();

    await act(() => maps[1].fire("load"));
    expect(maps[1].setFeatureState).toHaveBeenCalledTimes(1);
  });
});
