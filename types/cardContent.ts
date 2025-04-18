import { EventSummaryResponseDTO } from "./api/event";

export type CardContent = Omit<EventSummaryResponseDTO, 'city' | 'region' | 'province'>;

export interface CardContentProps {
  event: CardContent;
  isPriority?: boolean;
  isHorizontal?: boolean;
}

export interface MemoizedValues {
  title: string;
  location: string;
  subLocation: string;
  image: string;
  eventDate: string;
}
