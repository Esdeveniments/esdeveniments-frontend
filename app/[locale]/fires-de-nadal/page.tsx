import FestivityPageView from "@components/ui/festivity/FestivityPageView";
import { buildFestivityMetadata } from "@lib/seo/festivity";

export function generateMetadata() {
  return buildFestivityMetadata("fires-de-nadal");
}

export default function Page() {
  return <FestivityPageView slug="fires-de-nadal" />;
}
