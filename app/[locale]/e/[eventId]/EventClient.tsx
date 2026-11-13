"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@i18n/routing";
import { useAuth } from "@components/hooks/useAuth";
// import useOnScreen from "components/hooks/useOnScreen";
import { useEventAnalytics } from "./hooks/useEventAnalytics";

import type { EventClientProps } from "types/props";
import EventNotifications from "./components/EventNotifications";
// import { useEventModals } from "./hooks/useEventModals";
// import EventModals from "./components/EventModals";
import { ensureGtag, sendGoogleEvent } from "@utils/analytics";

// computeTemporalStatus now imported from utils/event-status for reuse & testability

// Only relevant right after the owner publishes, so keep it out of the
// detail page bundle.
const PromoteUpsellModal = dynamic(
  () => import("./components/PromoteUpsellModal"),
  { ssr: false },
);

export default function EventClient({
  event,
}: EventClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
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

  // /publica redirects here with ?promote=1 after a publish. Anyone can add
  // the marker to a URL, so show the upsell only once ownership is confirmed.
  const isOwner = Boolean(event.ownerId) && user?.id === event.ownerId;
  // Latched: the share step strips ?promote=1 from the URL (so a reload
  // doesn't reopen the upsell), and the modal must stay open after that.
  const [promoteUpsellStarted, setPromoteUpsellStarted] = useState(false);
  if (!promoteUpsellStarted && isOwner && searchParams.get("promote") === "1") {
    setPromoteUpsellStarted(true);
  }
  const [promoteDismissed, setPromoteDismissed] = useState(false);
  const showPromoteUpsell = promoteUpsellStarted && !promoteDismissed;

  const hasFiredPromoteShownRef = useRef(false);
  useEffect(() => {
    if (showPromoteUpsell && !hasFiredPromoteShownRef.current) {
      hasFiredPromoteShownRef.current = true;
      ensureGtag();
      sendGoogleEvent("promote_modal_shown", {
        event_slug: event.slug ?? "",
        source: "event_detail",
      });
    }
  }, [showPromoteUpsell, event.slug]);

  const handlePromoteUpsellOpenChange = (open: boolean) => {
    if (open) return;
    setPromoteDismissed(true);
    // Strip only the one-time marker; keep any other query params.
    const remainingParams = new URLSearchParams(searchParams.toString());
    remainingParams.delete("promote");
    const query = remainingParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

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

  useEventAnalytics(event);

  const slug = event.slug ?? "";
  const title = event.title ?? "";

  return (
    <>
      <EventNotifications
        newEvent={!!newEvent}
        title={title}
        slug={slug}
        showThankYouBanner={!!showThankYouBanner}
        setShowThankYouBanner={setShowThankYouBanner}
      />

      {showPromoteUpsell && (
        <PromoteUpsellModal
          open={showPromoteUpsell}
          setOpen={handlePromoteUpsellOpenChange}
          slug={slug}
          shareEvent={event.share}
        />
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
                  sendGoogleEvent("change_modal_open", {});
                }}
                className="gap-2 ease-in-out duration-300 border-background hover:border-foreground-strong"
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
