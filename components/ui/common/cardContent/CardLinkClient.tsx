"use client";

import PressableAnchorClient from "@components/ui/primitives/PressableAnchorClient";
import type { CardLinkProps } from "types/ui";

export default function CardLinkClient({
  className = "",
  variant = "card",
  ...props
}: CardLinkProps) {
  return (
    <PressableAnchorClient
      {...props}
      className={className}
      variant={variant}
      prefetch={props.prefetch ?? false}
    />
  );
}


