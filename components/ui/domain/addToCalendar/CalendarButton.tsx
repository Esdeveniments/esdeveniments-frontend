import { memo } from "react";
import { CalendarIcon, ChevronDownIcon } from "@heroicons/react/outline";
import { Button } from "@components/ui/primitives/button";
import { CalendarButtonProps } from "types/common";

const CalendarButton: React.FC<CalendarButtonProps> = ({
  onClick,
  hideText = false,
  open = false,
}) => (
  <Button
    onClick={onClick}
    variant="outline"
    hasIcon
    aria-haspopup="menu"
    data-open={open}
    className="group"
  >
    <span className="mr-component-xs flex h-6 w-6 items-center justify-center rounded-md border border-blackCorp/10 bg-whiteCorp p-component-xs">
      <CalendarIcon className="h-4 w-4 text-primary" />
    </span>
    {!hideText && "Afegir al calendari"}
    <ChevronDownIcon className="ml-component-xs h-4 w-4 transition-transform duration-200 group-data-[open=true]:rotate-180" />
  </Button>
);

export default memo(CalendarButton);
