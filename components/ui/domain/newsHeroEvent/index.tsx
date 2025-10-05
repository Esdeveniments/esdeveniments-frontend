import type { NewsHeroEventProps } from "types/props";
import { Card as CardPrimitive } from "@components/ui/primitives";

export default function NewsHeroEvent({ event }: NewsHeroEventProps) {
  return <CardPrimitive type="news-hero" event={event} placeSlug="" />;
}
