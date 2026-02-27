import type { JSX } from "react";
import type { ListProps } from "types/common";

export default function List({ events, children }: ListProps): JSX.Element {
  return (
    <section className="flex flex-col justify-center items-center gap-element-gap">
      {events?.map((event, index) => (
        <div
          key={event.id ?? `item-${index}`}
          className={`w-full ${event.isAd ? "content-auto-ad" : "content-auto"}`}
        >
          {children(event, index)}
        </div>
      ))}
    </section>
  );
}
