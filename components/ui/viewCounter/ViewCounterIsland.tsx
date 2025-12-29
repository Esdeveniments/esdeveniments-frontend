import ViewCounter from "@components/ui/viewCounter";
import { ViewCounterProps } from "types/common";

export default function ViewCounterIsland({
  visits,
  hideText = true,
  className,
}: ViewCounterProps & { className?: string }) {

  return (
    <div className={className || ""} data-view-counter style={{ minWidth: 80 }}>
      <ViewCounter visits={visits} hideText={hideText} />
    </div>
  );
}
