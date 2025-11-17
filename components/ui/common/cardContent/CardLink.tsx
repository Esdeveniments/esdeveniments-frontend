import PressableLink from "@components/ui/primitives/PressableLink";
import type { CardLinkProps } from "types/ui";

export default function CardLink({
  className = "",
  ...props
}: CardLinkProps) {
  return (
    <PressableLink
      {...props}
      className={className}
      variant="card"
      prefetch={props.prefetch ?? false}
    />
  );
}
