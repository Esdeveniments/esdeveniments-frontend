import { memo, JSX } from "react";
import type { ListProps } from "types/common";

function List({ events, children }: ListProps): JSX.Element {
  return (
    <section className="flex flex-col items-center justify-center">
      {events?.map((event, index) => children(event, index))}
    </section>
  );
}

export default memo(List);
