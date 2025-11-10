import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getInternalApiUrl,
  buildEventsQuery,
  buildNewsQuery,
} from "../utils/api-helpers";
import type { FetchEventsParams } from "types/event";
import type { FetchNewsParams } from "@lib/api/news";

const originalEnv = { ...process.env };

describe("utils/api-helpers:getInternalApiUrl", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    // non-production -> siteUrl = http://localhost:3000
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("builds absolute URLs from app-relative API paths", () => {
    expect(getInternalApiUrl("/api/foo?x=1")).toBe(
      "http://localhost:3000/api/foo?x=1"
    );
    expect(getInternalApiUrl("api/bar")).toBe("http://localhost:3000/api/bar");
  });
});

describe("utils/api-helpers:buildEventsQuery", () => {
  it("sets default page and size when not provided", () => {
    const params: FetchEventsParams = {};
    const query = buildEventsQuery(params);
    expect(query.get("page")).toBe("0");
    expect(query.get("size")).toBe("10");
  });

  it("uses provided page and size values", () => {
    const params: FetchEventsParams = { page: 2, size: 20 };
    const query = buildEventsQuery(params);
    expect(query.get("page")).toBe("2");
    expect(query.get("size")).toBe("20");
  });

  it("includes all optional string parameters when provided", () => {
    const params: FetchEventsParams = {
      place: "barcelona",
      category: "concerts",
      term: "rock music",
      byDate: "avui",
      from: "2025-01-01",
      to: "2025-01-31",
    };
    const query = buildEventsQuery(params);
    expect(query.get("place")).toBe("barcelona");
    expect(query.get("category")).toBe("concerts");
    expect(query.get("term")).toBe("rock music");
    expect(query.get("byDate")).toBe("avui");
    expect(query.get("from")).toBe("2025-01-01");
    expect(query.get("to")).toBe("2025-01-31");
  });

  it("includes numeric location parameters when provided", () => {
    const params: FetchEventsParams = {
      lat: 41.3851,
      lon: 2.1734,
      radius: 25,
    };
    const query = buildEventsQuery(params);
    expect(query.get("lat")).toBe("41.3851");
    expect(query.get("lon")).toBe("2.1734");
    expect(query.get("radius")).toBe("25");
  });

  it("omits undefined optional parameters", () => {
    const params: FetchEventsParams = {
      page: 1,
      place: "barcelona",
      // category, lat, lon, etc. are undefined
    };
    const query = buildEventsQuery(params);
    expect(query.has("category")).toBe(false);
    expect(query.has("lat")).toBe(false);
    expect(query.has("lon")).toBe(false);
    expect(query.has("radius")).toBe(false);
    expect(query.has("term")).toBe(false);
    expect(query.has("byDate")).toBe(false);
    expect(query.has("from")).toBe(false);
    expect(query.has("to")).toBe(false);
  });

  it("handles all parameters together", () => {
    const params: FetchEventsParams = {
      page: 3,
      size: 15,
      place: "girona",
      category: "teatre",
      lat: 41.9794,
      lon: 2.8214,
      radius: 10,
      term: "drama",
      byDate: "setmana",
      from: "2025-02-01",
      to: "2025-02-28",
    };
    const query = buildEventsQuery(params);
    expect(query.get("page")).toBe("3");
    expect(query.get("size")).toBe("15");
    expect(query.get("place")).toBe("girona");
    expect(query.get("category")).toBe("teatre");
    expect(query.get("lat")).toBe("41.9794");
    expect(query.get("lon")).toBe("2.8214");
    expect(query.get("radius")).toBe("10");
    expect(query.get("term")).toBe("drama");
    expect(query.get("byDate")).toBe("setmana");
    expect(query.get("from")).toBe("2025-02-01");
    expect(query.get("to")).toBe("2025-02-28");
  });

  it("converts all values to strings", () => {
    const params: FetchEventsParams = {
      page: 5,
      size: 30,
      lat: 40.4168,
      lon: -3.7038,
      radius: 50,
    };
    const query = buildEventsQuery(params);
    expect(typeof query.get("page")).toBe("string");
    expect(typeof query.get("size")).toBe("string");
    expect(typeof query.get("lat")).toBe("string");
    expect(typeof query.get("lon")).toBe("string");
    expect(typeof query.get("radius")).toBe("string");
  });
});

describe("utils/api-helpers:buildNewsQuery", () => {
  it("sets default page and size when setDefaults=true (default)", () => {
    const params: FetchNewsParams = {};
    const query = buildNewsQuery(params);
    expect(query.get("page")).toBe("0");
    expect(query.get("size")).toBe("100");
  });

  it("omits page and size when setDefaults=false and not provided", () => {
    const params: FetchNewsParams = {};
    const query = buildNewsQuery(params, false);
    expect(query.has("page")).toBe(false);
    expect(query.has("size")).toBe(false);
  });

  it("uses provided page and size when setDefaults=true", () => {
    const params: FetchNewsParams = { page: 2, size: 50 };
    const query = buildNewsQuery(params, true);
    expect(query.get("page")).toBe("2");
    expect(query.get("size")).toBe("50");
  });

  it("includes provided page and size when setDefaults=false", () => {
    const params: FetchNewsParams = { page: 3, size: 25 };
    const query = buildNewsQuery(params, false);
    expect(query.get("page")).toBe("3");
    expect(query.get("size")).toBe("25");
  });

  it("includes place parameter when provided", () => {
    const params: FetchNewsParams = { place: "barcelona" };
    const query = buildNewsQuery(params);
    expect(query.get("place")).toBe("barcelona");
  });

  it("omits place when not provided", () => {
    const params: FetchNewsParams = {};
    const query = buildNewsQuery(params);
    expect(query.has("place")).toBe(false);
  });

  it("handles all parameters together with defaults", () => {
    const params: FetchNewsParams = {
      page: 1,
      size: 20,
      place: "girona",
    };
    const query = buildNewsQuery(params, true);
    expect(query.get("page")).toBe("1");
    expect(query.get("size")).toBe("20");
    expect(query.get("place")).toBe("girona");
  });

  it("handles all parameters together without defaults", () => {
    const params: FetchNewsParams = {
      page: 1,
      size: 20,
      place: "girona",
    };
    const query = buildNewsQuery(params, false);
    expect(query.get("page")).toBe("1");
    expect(query.get("size")).toBe("20");
    expect(query.get("place")).toBe("girona");
  });

  it("converts all values to strings", () => {
    const params: FetchNewsParams = {
      page: 5,
      size: 30,
      place: "lleida",
    };
    const query = buildNewsQuery(params);
    expect(typeof query.get("page")).toBe("string");
    expect(typeof query.get("size")).toBe("string");
    expect(typeof query.get("place")).toBe("string");
  });
});
