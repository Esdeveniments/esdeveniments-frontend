import { PromotionReturnPage, promotionReturnMetadata } from "../PromotionStatusPanel";

export const generateMetadata = () => promotionReturnMetadata("success");

export default function PromoteSuccessPage({ params }: PageProps<"/[locale]/e/[eventId]/promote/success">) {
  return <PromotionReturnPage params={params} variant="success" />;
}
