"use client";
import { useState, useEffect } from "react";
import type { EventTemporalStatus } from "types/event-status";
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
  SpeakerphoneIcon,
} from "@heroicons/react/outline";
import AdArticle from "components/ui/adArticle";

// const Tooltip = dynamic(() => import("components/ui/tooltip"), {
//   ssr: false,
// });

// computeTemporalStatus now imported from utils/event-status for reuse & testability

export default function EventClient({
  event,
  temporalStatus,
}: {
  event: EventDetailResponseDTO;
  temporalStatus: EventTemporalStatus;
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

      {/* Weather (hidden for past events to reduce noise) */}
      {temporalStatus.state !== "past" && (
        <div className="w-full">
          <EventWeather weather={event.weather} />
        </div>
      )}
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
