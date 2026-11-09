import CardLink from "./CardLink";
import CompactCardView from "./CompactCardView";
import type { CompactCardProps } from "types/props";

export default function CompactCard(props: CompactCardProps) {
  return <CompactCardView {...props} LinkComponent={CardLink} />;
}
