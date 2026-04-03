// Backend place classification — distinct from the frontend PlaceType in types/common.ts
export type PlaceKind = "PROVINCE" | "REGION" | "CITY";

export interface PlaceResponseDTO {
  id: number;
  type: PlaceKind;
  name: string;
  slug: string;
}
