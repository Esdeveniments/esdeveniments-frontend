import ChartBarIcon from "@heroicons/react/outline/ChartBarIcon";
import type { ViewCounterProps } from "types/common";
import { Text } from "@components/ui/primitives";

function ViewCounter({ visits, hideText = false }: ViewCounterProps) {
  return (
    // ensure icon + text never wrap to two lines
    <div className="text-md flex h-8 min-w-[80px] items-center justify-end gap-xs whitespace-nowrap">
      <ChartBarIcon className="h-5 w-5" />
      <Text size="base" className="tabular-nums leading-none">
        {hideText ? visits : `${visits} visit${visits === 1 ? "a" : "es"}`}
      </Text>
    </div>
  );
}

export default ViewCounter;
