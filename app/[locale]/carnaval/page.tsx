import FestivityPageView from "@components/ui/festivity/FestivityPageView";
import { buildFestivityMetadata } from "@lib/seo/festivity";

export function generateMetadata() {
  return buildFestivityMetadata("carnaval");
}

export default function Page() {
  return <FestivityPageView slug="carnaval" />;
}
