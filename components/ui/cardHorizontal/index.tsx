import { memo } from "react";
import dynamic from "next/dynamic";
import CardContent from "@components/ui/common/cardContent";
import type { CardHorizontalProps } from "types/common";

const CardHorizontalLoading = dynamic(
  () => import("@components/ui/cardLoading"),
  {
    loading: () => (
      <div className="flex justify-center items-center w-full">
        <div className="w-full h-60 bg-darkCorp animate-fast-pulse"></div>
      </div>
    ),
  }
);

const AdCard = dynamic(() => import("@components/ui/adCard"), {
  loading: () => (
    <div className="flex justify-center items-center w-full">
      <div className="w-full h-60 bg-darkCorp animate-fast-pulse"></div>
    </div>
  ),
  ssr: false,
});

const CardHorizontal: React.FC<CardHorizontalProps> = ({
  event,
  isLoading,
  isPriority,
}) => {
  if (isLoading) return <CardHorizontalLoading />;

  if (event.isAd) {
    return <AdCard />;
  }

  return (
    <CardContent event={event} isPriority={isPriority} isHorizontal={true} />
  );
};

const areEqual = (
  prevProps: CardHorizontalProps,
  nextProps: CardHorizontalProps
): boolean => {
  if (!prevProps.event && !nextProps.event) {
    return (
      prevProps.isLoading === nextProps.isLoading &&
      prevProps.isPriority === nextProps.isPriority
    );
  }

  if (!prevProps.event || !nextProps.event) {
    return false;
  }

  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.isPriority === nextProps.isPriority &&
    prevProps.event.id === nextProps.event.id
  );
};

CardHorizontal.displayName = "CardHorizontal";

export default memo(CardHorizontal, areEqual);
