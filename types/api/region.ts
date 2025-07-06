export interface CityDropdownResponseDTO {
  id: number;
  value: string;
  label: string;
}

export interface RegionsGroupedByCitiesResponseDTO {
  id: number;
  name: string;
  cities: CityDropdownResponseDTO[];
}
