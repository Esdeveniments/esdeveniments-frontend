import { memo, JSX } from "react";
import type { ListProps } from "types/common";

function List({ events, children }: ListProps): JSX.Element {
  return (
    <section className="flex flex-col justify-center items-center">
      {events?.map((event, index) => (
        <div
          key={event.id ?? `item-${index}`}
          className={event.isAd ? "content-auto-ad w-full" : "content-auto w-full"}
        >
          {children(event, index)}
        </div>
      ))}
    </section>
  );
}

export default memo(List);
