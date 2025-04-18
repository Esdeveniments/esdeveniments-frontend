import { ReactNode } from "react";
import { Tooltip } from "react-tooltip";

interface TooltipComponentProps {
  id: string;
  children: ReactNode;
}

export default function TooltipComponent({ id, children }: TooltipComponentProps) {
  return <Tooltip id={id}>{children}</Tooltip>;
}
