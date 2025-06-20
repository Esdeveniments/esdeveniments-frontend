import { memo, FC, MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "@components/ui/common/image";
import { truncateString } from "@utils/helpers";
import { sendGoogleEvent } from "@utils/analytics";
import type { EventsAroundScrollProps } from "types/common";

const EventCardLoading: FC = () => {
  return (
    <div className="flex-none w-40 min-w-[10rem] flex flex-col bg-whiteCorp overflow-hidden cursor-pointer mb-10">
      {/* Image Placeholder */}
      <div className="w-full h-32 flex justify-center items-center overflow-hidden animate-fast-pulse">
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

const EventsAroundScroll: FC<EventsAroundScrollProps> = ({
  events,
  loading,
}) => {
  const { push } = useRouter();

  const sendEventClickGA = async (
    e: MouseEvent<HTMLAnchorElement>,
    link: string,
    eventId: string,
    eventTitle: string
  ): Promise<void> => {
    e.preventDefault();
    sendGoogleEvent("select_content", {
      content_type: "event",
      item_id: eventId,
      item_name: eventTitle,
      event_category: "Events Around",
      event_label: eventTitle,
    });
    await push(link);
  };

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
      {events.map((event, index) => {
        const title = truncateString(event.title || "", 60);
        const image = event.imageUrl;
        const link = `/e/${event.slug}`;

        return (
          <div
            key={event.id}
            className="flex-none w-40 min-w-[10rem] flex flex-col bg-whiteCorp overflow-hidden cursor-pointer mb-10"
          >
            <Link
              href={`/e/${event.slug}`}
              onClick={(e) => sendEventClickGA(e, link, event.id, event.title)}
            >
              {/* ImageEvent */}
              <div className="w-full h-32 flex justify-center items-center overflow-hidden">
                <Image
                  className="w-full object-cover"
                  title={event.title}
                  alt={event.title}
                  image={image}
                  priority={index <= 1}
                />
              </div>
              {/* Title */}
              <div className="flex pt-2">
                <div className="pt-[2px] pr-2">
                  <div className="w-2 h-4 bg-gradient-to-r from-primary to-primarydark"></div>
                </div>
                <h3 className="text-sm font-semibold text-ellipsis overflow-hidden whitespace-nowrap">
                  {title}
                </h3>
              </div>
              {/* Location */}
              <div className="pt-1">
                <div className="text-xs font-normal text-ellipsis overflow-hidden whitespace-nowrap">
                  <span>{event.location || ""}</span>
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
};

EventsAroundScroll.displayName = "EventsAroundScroll";

export default memo(EventsAroundScroll);
