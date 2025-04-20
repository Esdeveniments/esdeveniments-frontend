export interface FilterState {
  place: string;
  byDate: string;
  category: string;
  distance: string;
  openModal: boolean;
  setState: (
    key: "place" | "byDate" | "category" | "distance" | "openModal",
    value: string | boolean
  ) => void;
}
