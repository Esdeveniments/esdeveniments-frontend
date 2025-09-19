"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
// import useOnScreen from "components/hooks/useOnScreen";
import { sendGoogleEvent } from "@utils/analytics";

import type { EventDetailResponseDTO } from "types/api/event";
import EventNotifications from "./components/EventNotifications";
import EventWeather from "./components/EventWeather";
import EventLocation from "./components/EventLocation";
// import { useEventModals } from "./hooks/useEventModals";
// import EventModals from "./components/EventModals";
import {
  // PencilIcon,
  // InformationCircleIcon as InfoIcon,
  GlobeAltIcon as WebIcon,
  SpeakerphoneIcon,
} from "@heroicons/react/outline";
import AdArticle from "components/ui/adArticle";

// const Tooltip = dynamic(() => import("components/ui/tooltip"), {
//   ssr: false,
// });

// Helper function to calculate time until event
function calculateTimeUntil(startDate: string, endDate?: string): string {
  const now = new Date();
  const eventStart = new Date(startDate);
  const eventEnd = endDate ? new Date(endDate) : null;

  // Event has already ended
  if (eventEnd && now > eventEnd) {
    return "L'esdeveniment ha finalitzat";
  }

  // Event is currently ongoing
  if (eventEnd && now >= eventStart && now <= eventEnd) {
    const timeDiff = eventEnd.getTime() - now.getTime();
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days > 0) {
      return `Acaba en ${days} dies`;
    } else if (hours > 0) {
      return `Acaba en ${hours} hores`;
    } else {
      return "L'esdeveniment acaba aviat";
    }
  }

  // Event hasn't started yet
  const timeDiff = eventStart.getTime() - now.getTime();

  if (timeDiff <= 0) {
    return "L'esdeveniment és ara";
  }

  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  if (days > 0) {
    return `Comença en ${days} dies`;
  } else if (hours > 0) {
    return `Comença en ${hours} hores`;
  } else {
    return "L'esdeveniment és avui";
  }
}

export default function EventClient({
  event,
}: {
  event: EventDetailResponseDTO;
}) {
  // const editModalRef = useRef<HTMLDivElement>(null);

  // const isEditModalVisible = useOnScreen(
  //   editModalRef as React.RefObject<Element>,
  //   {
  //     freezeOnceVisible: true,
  //   }
  // );

  const searchParams = useSearchParams() ?? new URLSearchParams();
  const newEvent = searchParams.get("newEvent");
  const edit_suggested = searchParams.get("edit_suggested") === "true";
  const [showThankYouBanner, setShowThankYouBanner] = useState(edit_suggested);

  // const {
  //   openModal,
  //   setOpenModal,
  //   openDeleteReasonModal,
  //   setOpenModalDeleteReasonModal,
  //   reasonToDelete,
  //   setReasonToDelete,
  //   onSendDeleteReason,
  //   onRemove,
  // } = useEventModals();

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

      {/* Location with Map Toggle */}
      <EventLocation
        location={event.location}
        cityName={cityName}
        regionName={regionName}
      />
      {/* Ad Section */}
      <div className="w-full h-full flex justify-center items-start px-4 min-h-[250px] gap-2">
        <SpeakerphoneIcon className="w-5 h-5 mt-1" />
        <div className="w-11/12 flex flex-col gap-4">
          <h2>Contingut patrocinat</h2>
          <AdArticle slot="9643657007" />
        </div>
      </div>
      {/* Weather */}
      <div className="w-full">
        <EventWeather weather={event.weather} />
      </div>
      {/* Event Details Section */}
      <div className="w-full flex justify-center items-start gap-2 px-4">
        <WebIcon className="w-5 h-5 mt-1" />
        <div className="w-11/12 flex flex-col gap-4">
          <h2>Detalls de l&apos;Esdeveniment</h2>
          <div className="flex justify-start items-center gap-2">
            <div className="flex items-center gap-1 font-normal">
              {calculateTimeUntil(event.startDate, event.endDate)}
            </div>
          </div>
          {event.duration && (
            <div className="flex justify-start items-center gap-2">
              <div className="flex items-center gap-1 font-normal">
                Durada aproximada: {event.duration}
              </div>
            </div>
          )}
          {event.url && (
            <div className="font-bold">
              Enllaç a l&apos;esdeveniment:
              <a
                className="text-primary hover:underline font-normal ml-1"
                href={event.url}
                target="_blank"
                rel="noreferrer"
              >
                {event.title}
              </a>
            </div>
          )}
        </div>
      </div>
      {/* Edit Button Section */}

      {/* <div className="w-full flex justify-center items-start gap-2 px-4">
        <PencilIcon className="w-5 h-5 mt-1" />
        <div className="w-11/12 flex flex-col gap-4">
          <h2>Suggerir un canvi</h2>
          {isEditModalVisible && (
            <div className="w-11/12 flex justify-start items-center gap-2 cursor-pointer">
              <div
                onClick={() => {
                  setOpenModal(true);
                  sendGoogleEvent("open-change-modal", {});
                }}
                className="gap-2 ease-in-out duration-300 border-whiteCorp hover:border-blackCorp"
              >
                <p className="font-medium flex items-center">Editar</p>
              </div>
              <InfoIcon className="w-5 h-5" data-tooltip-id="edit-button" />
              <Tooltip id="edit-button">
                Si després de veure la informació de l&apos;esdeveniment,
                <br />
                veus que hi ha alguna dada erronia o vols ampliar la
                <br />
                informació, pots fer-ho al següent enllaç. Revisarem el
                <br />
                canvi i actualitzarem l&apos;informació.
              </Tooltip>
            </div>
          )}
        </div>
      </div> */}
      {/* Edit Modal */}
      {/* <div ref={editModalRef} className="w-full">
        {isEditModalVisible && (
          <EventModals
            openModal={openModal}
            setOpenModal={setOpenModal}
            openDeleteReasonModal={openDeleteReasonModal}
            setOpenModalDeleteReasonModal={setOpenModalDeleteReasonModal}
            reasonToDelete={reasonToDelete}
            setReasonToDelete={setReasonToDelete}
            onSendDeleteReason={() =>
              onSendDeleteReason(String(event.id), event.title)
            }
            onRemove={onRemove}
            slug={event.slug}
          />
        )}
      </div> */}
    </>
  );
}
