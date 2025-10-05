import { memo, JSX } from "react";
import type { ListProps } from "types/common";

interface GridProps extends ListProps {
  className?: string;
}

function Grid({
  events,
  children,
  className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-component-md",
}: GridProps): JSX.Element {
  return (
    <section className={className}>
      {events?.map((event, index) => children(event, index))}
    </section>
  );
}

export default memo(Grid);
