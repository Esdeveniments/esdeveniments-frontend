import type { DeleteReason } from "./common";

export interface EditModalProps {
  openModal: boolean;
  setOpenModal: (open: boolean) => void;
  slug: string;
  setOpenModalDeleteReasonModal: (open: boolean) => void;
  openDeleteReasonModal: boolean;
  setReasonToDelete: (reason: DeleteReason) => void;
  reasonToDelete?: DeleteReason | null | undefined;
  onSendDeleteReason: () => void;
  onRemove: () => void;
}
