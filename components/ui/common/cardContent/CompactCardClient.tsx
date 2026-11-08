"use client";

import CardLinkClient from "./CardLinkClient";
import CompactCardView from "./CompactCardView";
import type { CompactCardProps } from "types/props";

export default function CompactCardClient(props: CompactCardProps) {
  return <CompactCardView {...props} LinkComponent={CardLinkClient} />;
}
