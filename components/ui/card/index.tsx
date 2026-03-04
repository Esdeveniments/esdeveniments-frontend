import type { CardProps } from "types/common";
import CardContentClient from "@components/ui/common/cardContent/CardContentClient";
import EventCardSkeleton from "@components/ui/common/skeletons/EventCardSkeleton";
import AdCardClient from "./AdCardClient";

export default function Card({
  event,
  isLoading = false,
  isPriority = false,
}: CardProps) {
  if (isLoading) return <EventCardSkeleton />;
  if (event.isAd) return <AdCardClient />;
  return (
    <CardContentClient
      event={event}
      isPriority={isPriority}
    />
  );
}
