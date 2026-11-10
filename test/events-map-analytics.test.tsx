import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UseEventsMapLibreInput } from "types/event-map";

const { sendGoogleEvent, maps } = vi.hoisted(() => ({
  sendGoogleEvent: vi.fn(),
  maps: [] as Array<{ fire: (type: string, event?: unknown) => Promise<void>; feature: unknown }>,
}));

vi.mock("@utils/analytics", () => ({ sendGoogleEvent }));
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));
vi.mock("maplibre-gl", () => {
  class FakeMap {
    handlers = new Map<string, Array<(event?: unknown) => unknown>>();
    feature: unknown = undefined;
    touchZoomRotate = { disableRotation: () => {} };
    constructor() {
      maps.push(this);
    }
    on(type: string, handler: (event?: unknown) => unknown) {
      this.handlers.set(type, [...(this.handlers.get(type) ?? []), handler]);
    }
    async fire(type: string, event?: unknown) {
      for (const handler of this.handlers.get(type) ?? []) await handler(event);
    }
    addControl() {}
    addSource() {}
    addLayer() {}
    remove() {}
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

function Harness() {
  const { containerRef } = useEventsMapLibre(input);
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
});
