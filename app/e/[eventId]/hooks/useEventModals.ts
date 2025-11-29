// Hook for modal state and transitions
import { useState } from "react";
import { sendGoogleEvent } from "@utils/analytics";
import type { DeleteReason } from "types/event";

export function useEventModals() {
  const [openModal, setOpenModal] = useState(false);
  const [openDeleteReasonModal, setOpenModalDeleteReasonModal] =
    useState(false);
  const [reasonToDelete, setReasonToDelete] = useState<DeleteReason>(null);
  const [showThankYouBanner, setShowThankYouBanner] = useState(false);

  const onSendDeleteReason = async (eventId: string, eventTitle: string) => {
    setOpenModalDeleteReasonModal(false);

    const rawResponse = await fetch(process.env.NEXT_PUBLIC_DELETE_EVENT!, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: eventId,
        title: eventTitle,
        reason: reasonToDelete,
        isProduction: process.env.NODE_ENV === "production",
      }),
    });

    if (!rawResponse.ok) {
      console.error("Failed to delete event:", rawResponse.status);
      return;
    }

    const { success } = await rawResponse.json();

    if (success) setShowThankYouBanner(true);

    sendGoogleEvent("send-delete", {
      value: reasonToDelete,
    });
  };

  const onRemove = () => {
    setOpenModal(false);
    setTimeout(() => setOpenModalDeleteReasonModal(true), 300);
    sendGoogleEvent("open-delete-modal", {});
  };

  return {
    openModal,
    setOpenModal,
    openDeleteReasonModal,
    setOpenModalDeleteReasonModal,
    reasonToDelete,
    setReasonToDelete,
    showThankYouBanner,
    setShowThankYouBanner,
    onSendDeleteReason,
    onRemove,
  };
}
