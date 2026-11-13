import type { ReactElement } from "react";

import type { CardServerProps } from "types/props";
import CardContentServer from "@components/ui/common/cardContent/CardContentServer";
import EventCardSkeleton from "@components/ui/common/skeletons/EventCardSkeleton";
import AdCardClient from "./AdCardClient";

export default function CardServer({
  event,
  labels,
  isLoading = false,
  isPriority = false,
  initialIsFavorite,
  headingLevel,
}: CardServerProps): ReactElement {
  if (isLoading) return <EventCardSkeleton />;
  if (event.isAd) return <AdCardClient />;

  const initialIsFavoriteSafe = Boolean(event.slug && initialIsFavorite);

  return (
    <CardContentServer
      event={event}
      labels={labels}
      isPriority={isPriority}
      initialIsFavorite={initialIsFavoriteSafe}
      headingLevel={headingLevel}
    />
  );
}
