import { memo } from "react";
import { CalendarIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import Button from "../common/button";
import { CalendarButtonProps } from "types/common";

const CalendarButton: React.FC<CalendarButtonProps> = ({
  onClick,
  hideText = false,
  open = false,
  label,
}) => (
  <Button
    onClick={onClick}
    variant="neutral"
    aria-haspopup="menu"
    data-open={open}
    className="group"
  >
    <CalendarIcon className="w-4 h-4 text-primary" aria-hidden="true" />
    {!hideText && (label || "Afegir al calendari")}
    <ChevronDownIcon className="w-4 h-4 transition-interactive group-data-[open=true]:rotate-180" aria-hidden="true" />
  </Button>
);

export default memo(CalendarButton);
