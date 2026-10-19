import { PromotionReturnPage, promotionReturnMetadata } from "../PromotionStatusPanel";

export const generateMetadata = () => promotionReturnMetadata("cancel");

export default function PromoteCancelPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  return <PromotionReturnPage params={params} variant="cancel" />;
}
