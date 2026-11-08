import { describe, expect, it } from "vitest";
import type { EventSummaryResponseDTO, ListEvent } from "types/api/event";
import { buildEventMapPoints, getEventVenueCoords } from "@utils/event-map";

const city = (id: number, name: string, latitude: number, longitude: number) => ({
  id,
  name,
  slug: name.toLowerCase(),
  latitude,
  longitude,
  postalCode: "08000",
  enabled: true,
});
const BCN = city(1, "Barcelona", 41.3874, 2.1686);
const MATARO = city(2, "Mataró", 41.54, 2.4445);

const event = (
  id: string,
  overrides: Partial<EventSummaryResponseDTO> = {},
): EventSummaryResponseDTO =>
  ({
    id,
    hash: id,
    slug: id,
    title: id,
    location: "Barcelona",
    city: BCN,
    categories: [],
    ...overrides,
  }) as EventSummaryResponseDTO;

const venue = (lat: number, lon: number) => ({
  latitude: lat,
  longitude: lon,
  locationPrecision: "VENUE" as const,
});

describe("getEventVenueCoords", () => {
  it("returns the venue only for VENUE precision near the town", () => {
    expect(getEventVenueCoords(event("a", venue(41.39, 2.17)))).toEqual({ lat: 41.39, lon: 2.17 });
    expect(
      getEventVenueCoords(event("b", { latitude: 41.39, longitude: 2.17, locationPrecision: "CITY" })),
    ).toBeNull();
    expect(getEventVenueCoords(event("c"))).toBeNull();
  });

  it("rejects a venue geocoded far from its town, at 0/0 or not finite", () => {
    // la Bisbal d'Empordà, ~100 km from Barcelona
    expect(getEventVenueCoords(event("a", venue(41.96, 3.04)))).toBeNull();
    expect(getEventVenueCoords(event("b", venue(0, 0)))).toBeNull();
    expect(getEventVenueCoords(event("c", venue(Number.NaN, 2.17)))).toBeNull();
  });
});

describe("buildEventMapPoints", () => {
  it("groups town-only events into one bubble per town and venues by coordinates", () => {
    const events: ListEvent[] = [
      event("t1"),
      event("t2"),
      event("m1", { city: MATARO, location: "Mataró" }),
      event("v1", { ...venue(41.38, 2.17), location: "Liceu" }),
      event("v2", { ...venue(41.38, 2.17), location: "Liceu" }),
      event("far", venue(41.96, 3.04)),
      { isAd: true, id: "ad" } as ListEvent,
      event("nocity", { city: undefined }),
    ];
    const points = buildEventMapPoints(events);
    const summary = points.map((p) => [p.kind, p.label, p.events.map((e) => e.id)]);
    expect(summary).toEqual([
      ["town", "Barcelona", ["t1", "t2", "far"]],
      ["town", "Mataró", ["m1"]],
      ["venue", "Liceu", ["v1", "v2"]],
    ]);
    expect(points[0]).toMatchObject({ lat: BCN.latitude, lon: BCN.longitude });
  });
});
