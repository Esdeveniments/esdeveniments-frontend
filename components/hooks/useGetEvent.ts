import useSWR, { preload } from "swr";
import { EventDetailResponseDTO } from "types/api/event";
import { fetchEventById } from "@lib/api/events";
import { EventProps } from "types/common";

const fetcher = async (
  _: string,
  uuid: string
): Promise<EventDetailResponseDTO | null> => {
  if (!uuid) {
    throw new Error("Event UUID is required");
  }
  return fetchEventById(uuid);
};

export const useGetEvent = (props: EventProps): EventDetailResponseDTO => {
  const eventId = props.event.slug;
  const swrKey = ["event", eventId];
  preload(swrKey, fetcher);

  return useSWR(swrKey, fetcher, {
    fallbackData: props.event,
    refreshInterval: 300000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshWhenOffline: false,
    suspense: true,
    keepPreviousData: true,
    revalidateOnMount: false,
  }).data!;
};
