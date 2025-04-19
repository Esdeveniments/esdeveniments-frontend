// Type guard for distinguishing EventSummaryResponseDTO from AdEvent
import { EventSummaryResponseDTO, ListEvent } from './event';

export function isEventSummaryResponseDTO(event: ListEvent): event is EventSummaryResponseDTO {
  return (
    typeof event === 'object' &&
    event !== null &&
    'hash' in event &&
    'slug' in event &&
    'title' in event &&
    'type' in event
  );
}
