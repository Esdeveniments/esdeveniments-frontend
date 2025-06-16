import ChartBarIcon from "@heroicons/react/outline/ChartBarIcon";
import type { ViewCounterProps } from "types/common";

function ViewCounter({ visits, hideText = false }: ViewCounterProps) {
  return (
    <div className="w-full flex justify-end items-center gap-2 text-md">
      <ChartBarIcon className="w-6 h-6" />
      {hideText ? visits : `${visits} visit${visits === 1 ? "a" : "es"}`}
    </div>
  );
}

export default ViewCounter;
