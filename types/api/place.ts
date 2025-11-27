// Place types matching backend PlaceResponseDTO and PlaceType
export type PlaceType = "PROVINCE" | "REGION" | "CITY";

export interface PlaceResponseDTO {
  id: number;
  type: PlaceType;
  name: string;
  slug: string;
}
