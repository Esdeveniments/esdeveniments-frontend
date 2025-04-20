import type { ListEvent } from "./api/event";
import type { PageData } from "./common";
import type { PlaceTypeAndLabel } from "./common";

export interface EventsProps {
  events: ListEvent[];
  hasServerFilters?: boolean;
  placeTypeLabel: PlaceTypeAndLabel;
  pageData: PageData;
}
