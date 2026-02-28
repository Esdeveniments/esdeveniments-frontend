import type { ReactElement } from "react";

import type { CardProps } from "types/common";
import CardContentServer from "@components/ui/common/cardContent";
import CardLoading from "@components/ui/cardLoading";
import AdCardClient from "./AdCardClient";

export default async function CardServer({
  event,
  isLoading = false,
  isPriority = false,
  initialIsFavorite,
}: CardProps): Promise<ReactElement> {
  if (isLoading) return <CardLoading />;
  if (event.isAd) return <AdCardClient />;

  const initialIsFavoriteSafe = Boolean(event.slug && initialIsFavorite);

  return (
    <CardContentServer
      event={event}
      isPriority={isPriority}
      initialIsFavorite={initialIsFavoriteSafe}
    />
  );
}
