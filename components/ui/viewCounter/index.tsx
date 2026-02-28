import { ChartBarIcon } from "@heroicons/react/24/outline";
import type { ViewCounterProps } from "types/common";

function ViewCounter({ visits, hideText = false, visitsLabel }: ViewCounterProps) {
  return (
    <div className={`flex justify-end items-center gap-1 body-small ${hideText ? "min-w-0" : "min-w-[80px]"} h-8 whitespace-nowrap`}>
      <ChartBarIcon className={hideText ? "w-4 h-4" : "w-5 h-5"} />
      <span className="tabular-nums leading-none">
        {hideText ? visits : visitsLabel}
      </span>
    </div>
  );
}

export default ViewCounter;
