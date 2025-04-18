import { memo, ReactElement, JSX } from "react";
import { Event } from "@store";

interface ListProps {
  events: Event[];
  // eslint-disable-next-line no-unused-vars
  children: (event: Event, index: number) => ReactElement;
}

function List({ events, children }: ListProps): JSX.Element {
  return (
    <>
      <section className="flex flex-col justify-center items-center">
        {events?.map((event, index) => children(event, index))}
      </section>
    </>
  );
}

export default memo(List);
