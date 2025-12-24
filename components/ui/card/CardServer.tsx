import type { ReactElement } from "react";

import type { CardProps } from "types/common";
import CardContentServer from "@components/ui/common/cardContent";
import CardLoading from "@components/ui/cardLoading";
import AdCardClient from "./AdCardClient";
import { getFavoritesFromCookies } from "@utils/favorites";

export default async function CardServer({
  event,
  isLoading = false,
  isPriority = false,
}: CardProps): Promise<ReactElement> {
  if (isLoading) return <CardLoading />;
  if (event.isAd) return <AdCardClient />;

  const favorites = await getFavoritesFromCookies();
  const initialIsFavorite = Boolean(event.slug && favorites.includes(event.slug));

  return (
    <CardContentServer
      event={event}
      isPriority={isPriority}
      isHorizontal={false}
      initialIsFavorite={initialIsFavorite}
    />
  );
}
