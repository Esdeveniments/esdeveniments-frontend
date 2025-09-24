import { memo } from "react";
import type { CardHorizontalProps } from "types/common";
import CardContentServer from "@components/ui/common/cardContent";
import CardLoading from "@components/ui/cardLoading";
import AdCardClient from "@components/ui/card/AdCardClient";

const CardHorizontal: React.FC<CardHorizontalProps> = ({
  event,
  isLoading,
  isPriority,
}) => {
  if (isLoading) return <CardLoading />;
  if (event.isAd) return <AdCardClient />;
  return (
    <CardContentServer
      event={event}
      isPriority={isPriority}
      isHorizontal
    />
  );
};

function areEqual(
  prevProps: CardHorizontalProps,
  nextProps: CardHorizontalProps
): boolean {
  if (!prevProps.event || !nextProps.event) return false;
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.isPriority === nextProps.isPriority &&
    prevProps.event.id === nextProps.event.id
  );
}

CardHorizontal.displayName = "CardHorizontal";

export default memo(CardHorizontal, areEqual);
