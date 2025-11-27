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
  cities: CityDropdownResponseDTO[];
}
