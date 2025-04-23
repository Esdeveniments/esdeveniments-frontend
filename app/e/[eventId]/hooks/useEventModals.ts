// Hook for modal state and transitions
import { useState } from "react";
import type { DeleteReason } from "types/event";

export function useEventModals() {
  const [openModal, setOpenModal] = useState(false);
  const [openDeleteReasonModal, setOpenModalDeleteReasonModal] = useState(false);
  const [reasonToDelete, setReasonToDelete] = useState<DeleteReason>(null);

  // Placeholder handlers, to be expanded as needed
  const onSendDeleteReason = () => {
    // TODO: Implement send delete reason logic
  };
  const onRemove = () => {
    // TODO: Implement remove event logic
  };

  return {
    openModal,
    setOpenModal,
    openDeleteReasonModal,
    setOpenModalDeleteReasonModal,
    reasonToDelete,
    setReasonToDelete,
    onSendDeleteReason,
    onRemove,
  };
}
