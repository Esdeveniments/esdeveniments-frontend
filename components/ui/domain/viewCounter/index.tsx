import ChartBarIcon from "@heroicons/react/outline/ChartBarIcon";
import { Text } from "@components/ui/primitives";
import type { ViewCounterProps } from "types/common";

function ViewCounter({ visits, hideText = false }: ViewCounterProps) {
  return (
    // ensure icon + text never wrap to two lines
    <div className="flex h-8 min-w-[80px] items-center justify-end gap-component-xs whitespace-nowrap">
      <ChartBarIcon className="h-5 w-5" />
      <Text as="span" variant="body-sm" className="tabular-nums leading-none">
        {hideText ? visits : `${visits} visit${visits === 1 ? "a" : "es"}`}
      </Text>
    </div>
  );
}

export default ViewCounter;
