export interface FilterState {
  place: string;
  byDate: string;
  category: string;
  searchTerm: string;
  distance: string;
  openModal: boolean;
  setState: (
    key:
      | "place"
      | "byDate"
      | "category"
      | "searchTerm"
      | "distance"
      | "openModal",
    value: string | boolean
  ) => void;
}
