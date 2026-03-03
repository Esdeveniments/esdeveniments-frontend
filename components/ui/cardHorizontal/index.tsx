import { memo } from "react";
import type { CardHorizontalProps } from "types/common";
import CardContentServer from "@components/ui/common/cardContent";
import EventCardSkeleton from "@components/ui/common/skeletons/EventCardSkeleton";
import AdCardClient from "@components/ui/card/AdCardClient";

const CardHorizontal: React.FC<CardHorizontalProps> = ({
  event,
  isLoading,
  isPriority,
}) => {
  if (isLoading) return <EventCardSkeleton />;
  if (event.isAd) return <AdCardClient />;
  return (
    <CardContentServer event={event} isPriority={isPriority} />
  );
};

CardHorizontal.displayName = "CardHorizontal";

export default memo(CardHorizontal);
