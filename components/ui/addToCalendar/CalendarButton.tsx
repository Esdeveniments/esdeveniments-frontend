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
    className="group"
  >
    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-background p-1 mr-2 border border-foreground-strong/10">
      <CalendarIcon className="w-4 h-4 text-primary" />
    </span>
    {!hideText && "Afegir al calendari"}
    <ChevronDownIcon className="w-4 h-4 ml-2 transition-transform duration-200 group-data-[open=true]:rotate-180" />
  </Button>
);

export default memo(CalendarButton);
