import React from "react";
import EditModal from "components/ui/editModal";
import type { EditModalProps } from "types/editModal";

const EventModals: React.FC<EditModalProps> = ({
  openModal,
  setOpenModal,
  openDeleteReasonModal,
  setOpenModalDeleteReasonModal,
  reasonToDelete,
  setReasonToDelete,
  onSendDeleteReason,
  onRemove,
  slug,
}) => {
  return (
    <>
      <EditModal
        openModal={openModal}
        setOpenModal={setOpenModal}
        slug={slug}
        setOpenModalDeleteReasonModal={setOpenModalDeleteReasonModal}
        openDeleteReasonModal={openDeleteReasonModal}
        setReasonToDelete={setReasonToDelete}
        reasonToDelete={reasonToDelete}
        onSendDeleteReason={onSendDeleteReason}
        onRemove={onRemove}
      />
      {/* Add other modals as needed */}
    </>
  );
};

export default EventModals;
