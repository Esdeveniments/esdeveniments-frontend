import { PromotionReturnPage, promotionReturnMetadata } from "../PromotionStatusPanel";

export const generateMetadata = () => promotionReturnMetadata("success");

export default function PromoteSuccessPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  return <PromotionReturnPage params={params} variant="success" />;
}
