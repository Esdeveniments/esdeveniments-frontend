import type { CardProps } from "types/common";
import CardContentServer from "@components/ui/common/cardContent";
import CardLoading from "@components/ui/cardLoading";
import AdCardClient from "./AdCardClient";

export default function Card({
  event,
  isLoading = false,
  isPriority = false,
}: CardProps) {
  if (isLoading) return <CardLoading />;
  if (event.isAd) return <AdCardClient />;
  return (
    <CardContentServer
      event={event}
      isPriority={isPriority}
      isHorizontal={false}
    />
  );
}
