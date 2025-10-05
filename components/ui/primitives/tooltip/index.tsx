import { Tooltip } from "react-tooltip";
import type { TooltipComponentProps } from "types/common";

export default function TooltipComponent({
  id,
  children,
}: TooltipComponentProps) {
  return <Tooltip id={id}>{children}</Tooltip>;
}
