import { LocalizedPressableAnchor } from "@components/ui/primitives/PressableAnchor";
import type { ServerCardLinkProps } from "types/ui";

export default function CardLink({
  className = "",
  variant = "card",
  ...props
}: ServerCardLinkProps) {
  return (
    <LocalizedPressableAnchor
      {...props}
      className={className}
      variant={variant}
      prefetch={props.prefetch ?? false}
    />
  );
}
