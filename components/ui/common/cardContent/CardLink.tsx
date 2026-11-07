import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import type { CardLinkProps } from "types/ui";

export default function CardLink({
  className = "",
  variant = "card",
  ...props
}: CardLinkProps) {
  return (
    <PressableAnchor
      {...props}
      className={className}
      variant={variant}
      prefetch={props.prefetch ?? false}
    />
  );
}
