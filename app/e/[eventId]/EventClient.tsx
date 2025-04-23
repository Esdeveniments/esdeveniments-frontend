"use client";
import { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import useOnScreen from "components/hooks/useOnScreen";
import { sendGoogleEvent } from "@utils/analytics";
import { formatEventDateRange } from "@utils/calendarUtils";
import type { EventDetailResponseDTO } from "types/api/event";
import EventNotifications from "./components/EventNotifications";
import EventHeader from "./components/EventHeader";
import EventDescription from "./components/EventDescription";
import EventTags from "./components/EventTags";
import EventCalendar from "./components/EventCalendar";
import EventWeather from "./components/EventWeather";
import EventLocation from "./components/EventLocation";
import { useEventModals } from "./hooks/useEventModals";
import EventModals from "./components/EventModals";

const EventsAround = dynamic(() => import("components/ui/eventsAround"), {
  ssr: false,
});

export default function EventClient({
  event,
}: {
  event: EventDetailResponseDTO;
}) {
  const weatherRef = useRef<HTMLDivElement>(null);
  const eventsAroundRef = useRef<HTMLDivElement>(null);
  const editModalRef = useRef<HTMLDivElement>(null);

  const isWeatherVisible = useOnScreen(weatherRef as React.RefObject<Element>, {
    freezeOnceVisible: true,
  });
  const isEditModalVisible = useOnScreen(
    editModalRef as React.RefObject<Element>,
    {
      freezeOnceVisible: true,
    }
  );
  const isEventsAroundVisible = useOnScreen(
    eventsAroundRef as React.RefObject<Element>,
    {
      freezeOnceVisible: true,
    }
  );

  const searchParams = useSearchParams() ?? new URLSearchParams();
  const newEvent = searchParams.get("newEvent");
  const edit_suggested = searchParams.get("edit_suggested") === "true";
  const [showThankYouBanner, setShowThankYouBanner] = useState(edit_suggested);

  const {
    openModal,
    setOpenModal,
    openDeleteReasonModal,
    setOpenModalDeleteReasonModal,
    reasonToDelete,
    setReasonToDelete,
    onSendDeleteReason,
    onRemove,
  } = useEventModals();

  useEffect(() => {
    sendGoogleEvent("view_event_page", {});
  }, []);

  const slug = event.slug ?? "";
  const title = event.title ?? "";
  const cityName = event.city?.name || "";
  const regionName = event.region?.name || "";

  return (
    <>
      <EventNotifications
        newEvent={!!newEvent}
        title={title}
        slug={slug}
        showThankYouBanner={!!showThankYouBanner}
        setShowThankYouBanner={setShowThankYouBanner}
      />
      <div className="w-full flex justify-center bg-whiteCorp pb-10">
        <div className="w-full flex flex-col justify-center items-center gap-4 sm:w-[520px] md:w-[520px] lg:w-[520px]">
          <article className="w-full flex flex-col justify-center items-start gap-8">
            <EventTags tags={event.tags || []} />
            <EventDescription description={event.description} />
            <div ref={eventsAroundRef} className="w-full">
              {isEventsAroundVisible && (
                <EventsAround
                  id={event.id}
                  title="Esdeveniments relacionats"
                  town={event?.city?.name || ""}
                  region={event?.region?.name || ""}
                />
              )}
            </div>
            <EventHeader
              title={title}
              eventDate={formatEventDateRange(event.startDate, event.endDate)}
              location={event.location}
              city={cityName}
              region={regionName}
            />
            {/* AddToCalendar */}
            <div className="w-full px-4">
              <EventCalendar event={event} />
            </div>
            {/* Location with Map Toggle */}
            <EventLocation
              location={event.location}
              cityName={cityName}
              regionName={regionName}
            />
            {/* Weather */}
            <div ref={weatherRef} className="w-full">
              {isWeatherVisible && (
                <EventWeather
                  startDate={event.startDate}
                  location={event.location}
                />
              )}
            </div>
          </article>
        </div>
      </div>
      <div ref={editModalRef} className="w-full">
        {isEditModalVisible && (
          <EventModals
            openModal={openModal}
            setOpenModal={setOpenModal}
            openDeleteReasonModal={openDeleteReasonModal}
            setOpenModalDeleteReasonModal={setOpenModalDeleteReasonModal}
            reasonToDelete={reasonToDelete}
            setReasonToDelete={setReasonToDelete}
            onSendDeleteReason={onSendDeleteReason}
            onRemove={onRemove}
            slug={event.slug}
          />
        )}
      </div>
    </>
  );
}
