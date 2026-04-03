import { FireIcon } from "@heroicons/react/24/solid";
import { EyeIcon } from "@heroicons/react/24/outline";
import type { ViewCounterProps } from "types/common";

const POPULAR_THRESHOLD = 50;

function ViewCounter({ visits, hideText = false, visitsLabel }: ViewCounterProps) {
  const isPopular = visits >= POPULAR_THRESHOLD;
  const Icon = isPopular ? FireIcon : EyeIcon;
  const iconColor = isPopular ? "text-primary" : "text-foreground-strong/70";

  return (
    <div className={`flex justify-end items-center gap-1 body-small ${hideText ? "min-w-0" : "min-w-[80px]"} h-8 whitespace-nowrap`}>
      <Icon className={`${hideText ? "w-4 h-4" : "w-5 h-5"} ${iconColor}`} />
      <span className={`tabular-nums leading-none ${isPopular ? "font-semibold text-foreground-strong" : ""}`}>
        {hideText ? visits : (visitsLabel ?? visits)}
      </span>
    </div>
  );
}

export default ViewCounter;
