export interface CityDropdownResponseDTO {
  id: number;
  value: string;
  label: string;
  latitude: number;
  longitude: number;
}

export interface RegionsGroupedByCitiesResponseDTO {
  id: number;
  name: string;
  /** May be absent from `/places/regions/options` — callers should fall back to slugifying `name`. */
  slug?: string;
  cities: CityDropdownResponseDTO[];
}
