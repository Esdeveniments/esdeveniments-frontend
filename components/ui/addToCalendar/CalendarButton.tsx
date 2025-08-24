import { memo } from "react";
import { PlusIcon } from "@heroicons/react/outline";
import { CalendarButtonProps } from "types/common";

const CalendarButton: React.FC<CalendarButtonProps> = ({
  onClick,
  hideText = false,
}) => (
  <button
    onClick={onClick}
    type="button"
    className="btn text-primary flex items-center justify-center hover:text-primarydark"
  >
    <div className="bg-whiteCorp p-1 mr-2 border border-black rounded ">
      <PlusIcon className="w-4 h-4" />
    </div>
    {!hideText && "Afegir al calendari"}
  </button>
);

export default memo(CalendarButton);
