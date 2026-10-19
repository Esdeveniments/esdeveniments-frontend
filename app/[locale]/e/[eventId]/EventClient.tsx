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
import { MegaphoneIcon as SpeakerphoneIcon } from "@heroicons/react/24/outline";
import AdArticle from "components/ui/adArticle";
import SectionHeading from "@components/ui/common/SectionHeading";
import { useTranslations } from "next-intl";
import { sendGoogleEvent } from "@utils/analytics";

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
  const t = useTranslations("Components.EventPage");
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
  const [promoteDismissed, setPromoteDismissed] = useState(false);
  const showPromoteUpsell =
    searchParams.get("promote") === "1" && isOwner && !promoteDismissed;

  const hasFiredPromoteShownRef = useRef(false);
  useEffect(() => {
    if (showPromoteUpsell && !hasFiredPromoteShownRef.current) {
      hasFiredPromoteShownRef.current = true;
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
        />
      )}

      {/* Ad Section */}
      <div className="w-full h-full min-h-[250px]">
        <div className="w-full flex flex-col gap-element-gap">
          <SectionHeading
            Icon={SpeakerphoneIcon}
            iconClassName="w-5 h-5 text-foreground-strong flex-shrink-0"
            title={t("sponsored")}
            titleClassName="heading-2"
          />
          <div className="px-section-x">
            <AdArticle slot="9643657007" />
          </div>
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
