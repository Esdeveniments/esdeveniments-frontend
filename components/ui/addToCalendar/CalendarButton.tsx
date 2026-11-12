import { memo } from "react";
import { CalendarIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import Button from "../common/button";
import { CalendarButtonProps } from "types/common";

const CalendarButton: React.FC<CalendarButtonProps> = ({
  onClick,
  open = false,
  label,
  visibleLabel,
  variant = "neutral",
  iconOnly = false,
  fullWidth = false,
}) => {
  const sizeClass = iconOnly ? "h-button w-button p-0" : fullWidth ? "w-full" : "";

  return (
    <Button
      onClick={onClick}
      variant={variant}
      aria-expanded={open}
      aria-label={iconOnly || visibleLabel ? label : undefined}
      data-open={open}
      className={`group ${sizeClass}`}
    >
      <CalendarIcon className="w-5 h-5" aria-hidden="true" />
      {!iconOnly && (
        <>
          {visibleLabel ?? label}
          <ChevronDownIcon
            className="w-4 h-4 transition-interactive group-data-[open=true]:rotate-180"
            aria-hidden="true"
          />
        </>
      )}
    </Button>
  );
};

export default memo(CalendarButton);
