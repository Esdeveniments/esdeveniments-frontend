import { PromotionReturnPage, promotionReturnMetadata } from "../PromotionStatusPanel";
import type { PromotionReturnRouteProps } from "types/props";

export const generateMetadata = () => promotionReturnMetadata("success");

export default function PromoteSuccessPage({ params }: PromotionReturnRouteProps) {
  return <PromotionReturnPage params={params} variant="success" />;
}
