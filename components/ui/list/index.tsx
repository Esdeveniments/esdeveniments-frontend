import type { JSX } from "react";
import type { ListProps } from "types/common";

export default function List({ events, children }: ListProps): JSX.Element {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {events?.map((event, index) => (
        <div
          key={event.id ?? `item-${index}`}
          className={event.isAd ? "md:col-span-2 xl:col-span-3 content-auto-ad" : "content-auto"}
        >
          {children(event, index)}
        </div>
      ))}
    </section>
  );
}
