import ChartBarIcon from "@heroicons/react/outline/ChartBarIcon";
import type { ViewCounterProps } from "types/common";

function ViewCounter({ visits, hideText = false }: ViewCounterProps) {
  return (
    // ensure icon + text never wrap to two lines
    <div className="flex justify-end items-center gap-1 body-small min-w-[80px] h-8 whitespace-nowrap">
      <ChartBarIcon className="w-5 h-5" />
      <span className="tabular-nums leading-none">
        {hideText ? visits : `${visits} visit${visits === 1 ? "a" : "es"}`}
      </span>
    </div>
  );
}

export default ViewCounter;
