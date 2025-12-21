"use client";

import PressableAnchorClient from "@components/ui/primitives/PressableAnchorClient";
import type { CardLinkProps } from "types/ui";

export default function CardLinkClient({
  className = "",
  ...props
}: CardLinkProps) {
  return (
    <PressableAnchorClient
      {...props}
      className={className}
      variant="card"
      prefetch={props.prefetch ?? false}
    />
  );
}

