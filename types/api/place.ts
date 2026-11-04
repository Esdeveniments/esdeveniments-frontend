// Backend place classification — distinct from the frontend PlaceType in types/common.ts
export type PlaceKind = "PROVINCE" | "REGION" | "CITY";

export interface PlaceResponseDTO {
  id: number;
  type: PlaceKind;
  name: string;
  slug: string;
}

/** Proxy-side place check: drives the real 404 / 301 for place URLs. */
export type ProxyPlaceResolution =
  | { kind: "exists" }
  | { kind: "alias"; slug: string }
  | { kind: "missing" }
  | { kind: "unknown" };

/** What Proxy does with a place path: 301 to the real slug, or 404. */
export type ProxyPlaceCheck = { kind: "alias"; url: URL } | { kind: "missing" };
