import FestivityPageView from "@components/ui/festivity/FestivityPageView";
import { buildFestivityMetadata } from "@lib/seo/festivity";

export function generateMetadata() {
  return buildFestivityMetadata("pessebres-vivents");
}

export default function Page() {
  return <FestivityPageView slug="pessebres-vivents" />;
}
