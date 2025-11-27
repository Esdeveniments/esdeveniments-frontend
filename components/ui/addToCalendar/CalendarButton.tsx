import { memo } from "react";
import { CalendarIcon, ChevronDownIcon } from "@heroicons/react/outline";
import Button from "../common/button";
import { CalendarButtonProps } from "types/common";

const CalendarButton: React.FC<CalendarButtonProps> = ({
  onClick,
  hideText = false,
  open = false,
}) => (
  <Button
    onClick={onClick}
    variant="neutral"
    aria-haspopup="menu"
    data-open={open}
    className="group py-2 px-3 h-auto text-sm"
  >
    <span className="flex-center w-5 h-5 rounded-button bg-background p-0.5 mr-1.5 border border-foreground-strong/10">
      <CalendarIcon className="w-3.5 h-3.5 text-primary" />
    </span>
    {!hideText && "Afegir al calendari"}
    <ChevronDownIcon className="w-3.5 h-3.5 ml-1.5 transition-interactive group-data-[open=true]:rotate-180" />
  </Button>
);

export default memo(CalendarButton);
