import type { CardProps } from "types/common";
import CardContentClient from "@components/ui/common/cardContent/CardContentClient";
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
    <CardContentClient
      event={event}
      isPriority={isPriority}
    />
  );
}
