import { PromotionReturnPage, promotionReturnMetadata } from "../PromotionStatusPanel";
import type { PromotionReturnRouteProps } from "types/props";

export const generateMetadata = () => promotionReturnMetadata("cancel");

export default function PromoteCancelPage({ params }: PromotionReturnRouteProps) {
  return <PromotionReturnPage params={params} variant="cancel" />;
}
