import { JSX, memo } from "react";
import dynamic from "next/dynamic";
import CardContent from "@components/ui/common/cardContent";
import { Event } from "@store";

const CardLoading = dynamic(() => import("@components/ui/cardLoading"), {
  loading: () => (
    <div className="flex justify-center items-center w-full">
      <div className="w-full h-60 bg-darkCorp animate-fast-pulse"></div>
    </div>
  ),
});

const AdCard = dynamic(() => import("@components/ui/adCard"), {
  loading: () => (
    <div className="flex justify-center items-center w-full">
      <div className="w-full h-60 bg-darkCorp animate-fast-pulse"></div>
    </div>
  ),
  ssr: false,
});

interface CardProps {
  event: Event;
  isLoading?: boolean;
  isPriority?: boolean;
}

function Card({
  event,
  isLoading = false,
  isPriority = false,
}: CardProps): JSX.Element {
  if (isLoading) return <CardLoading />;

  if (event.isAd) {
    return <AdCard />;
  }

  return (
    <CardContent event={event} isPriority={isPriority} isHorizontal={false} />
  );
}

function areEqual(prevProps: CardProps, nextProps: CardProps): boolean {
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
}

export default memo(Card, areEqual);
