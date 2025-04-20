import { UserLocation } from "@store";

export interface FiltersModalProps {
  openModal: boolean;
  place: string;
  byDate: string;
  category: string;
  distance: string;
  userLocation: UserLocation | null;
  setState: (
    key:
      | "place"
      | "byDate"
      | "category"
      | "distance"
      | "openModal"
      | "userLocation"
      | "filtersApplied",
    value: string | boolean | UserLocation | null
  ) => void;
}
