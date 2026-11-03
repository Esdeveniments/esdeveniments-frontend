import { PromotionReturnPage, promotionReturnMetadata } from "../PromotionStatusPanel";

export const generateMetadata = () => promotionReturnMetadata("cancel");

export default function PromoteCancelPage({ params }: PageProps<"/[locale]/e/[eventId]/promote/cancel">) {
  return <PromotionReturnPage params={params} variant="cancel" />;
}
