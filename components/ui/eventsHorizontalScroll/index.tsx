import { memo, FC } from "react";
import CardHorizontal from "@components/ui/cardHorizontal";
import type { EventsHorizontalScrollProps } from "types/common";

const EventCardLoading: FC = () => {
  return (
    <div className="flex-none w-96 min-w-[24rem] flex flex-col bg-whiteCorp overflow-hidden cursor-pointer">
      {/* Image Placeholder */}
      <div className="w-full h-64 flex justify-center items-center overflow-hidden animate-fast-pulse">
        <div className="w-full h-full bg-darkCorp"></div>
      </div>
      {/* Title Placeholder */}
      <div className="p-1 pt-4">
        <div className="w-2/3 h-5 bg-darkCorp rounded-xl animate-fast-pulse"></div>
      </div>
      {/* Location Placeholder */}
      <div className="p-1">
        <div className="w-full h-full flex items-start animate-fast-pulse">
          <div className="h-4 w-4 bg-darkCorp rounded-xl"></div>
          <div className="w-full h-full flex flex-col justify-center items-start px-2 gap-2">
            <div className="w-2/3 my-1 bg-darkCorp h-3 rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EventsHorizontalScroll: FC<EventsHorizontalScrollProps> = ({
  events,
  loading,
  usePriority,
}) => {
  if (loading) {
    return (
      <div className="w-full flex overflow-x-auto py-4 space-x-4">
        <EventCardLoading />
        <EventCardLoading />
        <EventCardLoading />
      </div>
    );
  }

  return (
    <div className="w-full flex overflow-x-auto py-4 space-x-4">
      {events.map((event, index) => (
        <div
          key={event.id}
          className="flex-none w-96 min-w-[24rem] flex flex-col bg-whiteCorp overflow-hidden cursor-pointer"
        >
          <CardHorizontal
            event={event}
            isPriority={usePriority && (index === 0 || index === 1)}
          />
        </div>
      ))}
    </div>
  );
};

EventsHorizontalScroll.displayName = "EventsHorizontalScroll";
EventCardLoading.displayName = "EventCardLoading";

export default memo(EventsHorizontalScroll);
