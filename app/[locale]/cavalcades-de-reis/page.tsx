import FestivityPageView from "@components/ui/festivity/FestivityPageView";
import { buildFestivityMetadata } from "@lib/seo/festivity";

export function generateMetadata() {
  return buildFestivityMetadata("cavalcades-de-reis");
}

export default function Page() {
  return <FestivityPageView slug="cavalcades-de-reis" />;
}
