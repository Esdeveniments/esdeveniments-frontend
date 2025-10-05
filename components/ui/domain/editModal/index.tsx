import { FC } from "react";
import Link from "next/link";
import { Modal } from "@components/ui/patterns/Modal";
import { Text } from "@components/ui/primitives";
import { PencilIcon, XCircleIcon } from "@heroicons/react/outline";
import type { EditModalProps } from "types/editModal";

const EditModal: FC<EditModalProps> = ({
  openModal,
  setOpenModal,
  slug,
  setOpenModalDeleteReasonModal,
  openDeleteReasonModal,
  setReasonToDelete,
  reasonToDelete,
  onSendDeleteReason,
  onRemove,
}) => {
  return (
    <>
      <Modal.Root
        open={openModal}
        onOpenChange={(open: boolean) => {
          if (!open) setOpenModal(false);
        }}
      >
        <Modal.Header
          title="Suggereix una edició"
          onClose={() => setOpenModal(false)}
        />
        <Modal.Body>
          <ul role="list" className="divide-y divide-darkCorp text-left">
            <li key="edit" className="flex p-component-md">
              <Link href={`/e/${slug}/edita`} prefetch={false}>
                <div className="flex items-start justify-center gap-component-md">
                  <PencilIcon
                    className="h-6 w-6 text-primary"
                    aria-hidden="true"
                  />
                  <div className="flex flex-col">
                    <Text variant="body" className="font-semibold">
                      Canvia el títol o altres detalls
                    </Text>
                    <Text variant="body-sm">
                      Edita el títol, la ubicació, l&apos;horari, etc.
                    </Text>
                  </div>
                </div>
              </Link>
            </li>
            <li key="remove" className="flex p-component-md">
              <button className="cursor-pointer" onClick={onRemove}>
                <div className="flex items-start justify-center gap-component-md">
                  <XCircleIcon
                    className="h-6 w-6 text-primary"
                    aria-hidden="true"
                  />
                  <div className="flex flex-col">
                    <Text variant="body" className="font-semibold">
                      Eliminar
                    </Text>
                    <Text variant="body-sm">
                      L&apos;esdeveniment no existeix, està duplicat, etc.
                    </Text>
                  </div>
                </div>
              </button>
            </li>
          </ul>
        </Modal.Body>
      </Modal.Root>
      <Modal.Root
        open={openDeleteReasonModal}
        onOpenChange={(open: boolean) => {
          if (!open) setOpenModalDeleteReasonModal(false);
        }}
      >
        <Modal.Header
          title="Suggereix una el·liminació"
          onClose={() => setOpenModalDeleteReasonModal(false)}
        />
        <Modal.Body>
          <div className="flex flex-col">
            <div className="px-component-md text-left">
              <Text variant="body-sm">
                Motiu de l&apos;el·liminació suggerida
              </Text>
            </div>
            <fieldset className="flex flex-col gap-component-md py-component-md">
              <legend className="sr-only">Sol·licitud d&apos;eliminació</legend>
              <div className="flex items-center justify-start">
                <div className="p-component-xs">
                  <input
                    id="not-exist"
                    checked={reasonToDelete === "not-exist"}
                    onChange={() => setReasonToDelete("not-exist")}
                    aria-describedby="not-exist-description"
                    name="not-exist"
                    type="checkbox"
                    className="h-5 w-5 rounded-xl border-darkCorp text-primarydark focus:outline-none"
                  />
                </div>
                <div className="p-component-xs">
                  <label htmlFor="not-exist" className="text-blackCorp">
                    No existeix
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-start">
                <div className="p-component-xs">
                  <input
                    id="duplicated"
                    checked={reasonToDelete === "duplicated"}
                    onChange={() => setReasonToDelete("duplicated")}
                    aria-describedby="duplicated-description"
                    name="duplicated"
                    type="checkbox"
                    className="h-5 w-5 rounded-xl border-darkCorp text-primarydark focus:outline-none"
                  />
                </div>
                <div className="p-component-xs">
                  <label htmlFor="duplicated" className="text-blackCorp">
                    Duplicat
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-start">
                <div className="p-component-xs">
                  <input
                    id="offensive"
                    checked={reasonToDelete === "offensive"}
                    onChange={() => setReasonToDelete("offensive")}
                    aria-describedby="offensive-description"
                    name="offensive"
                    type="checkbox"
                    className="h-5 w-5 rounded-xl border-darkCorp text-primarydark focus:outline-none"
                  />
                </div>
                <div className="p-component-xs">
                  <label htmlFor="offensive" className="text-blackCorp">
                    Ofensiu, nociu o enganyós
                  </label>
                </div>
              </div>
              <div className="flex items-start justify-start text-left">
                <div className="p-component-xs">
                  <input
                    id="others"
                    checked={reasonToDelete === "others"}
                    onChange={() => setReasonToDelete("others")}
                    aria-describedby="others-description"
                    name="others"
                    type="checkbox"
                    className="h-5 w-5 rounded-xl border-darkCorp text-primarydark focus:outline-none"
                  />
                </div>
                <div className="p-component-xs">
                  <label htmlFor="others" className="text-blackCorp">
                    Altres
                  </label>
                  <Text id="offers-description" variant="body-sm">
                    Envieu un correu amb el motiu a:{" "}
                    <a
                      className="hover:text-primary"
                      href="mailto:hola@esdeveniments.cat"
                    >
                      hola@esdeveniments.cat
                    </a>
                  </Text>
                </div>
              </div>
            </fieldset>
            <div className="flex justify-center py-component-md">
              <button
                disabled={!reasonToDelete}
                onClick={() => {
                  if (reasonToDelete) {
                    onSendDeleteReason();
                  }
                }}
                className="rounded-xl border border-whiteCorp bg-primary px-component-lg py-component-sm font-barlow font-semibold uppercase italic tracking-wide text-whiteCorp duration-300 ease-in-out focus:outline-none disabled:cursor-default disabled:opacity-50 disabled:hover:bg-primary"
              >
                Enviar
              </button>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div className="flex justify-center py-component-md">
            <button
              disabled={!reasonToDelete}
              onClick={() => {
                if (reasonToDelete) {
                  onSendDeleteReason();
                }
              }}
              className="rounded-xl border border-whiteCorp bg-primary px-component-lg py-component-sm font-barlow font-semibold uppercase italic tracking-wide text-whiteCorp duration-300 ease-in-out focus:outline-none disabled:cursor-default disabled:opacity-50 disabled:hover:bg-primary"
            >
              Enviar
            </button>
          </div>
        </Modal.Footer>
      </Modal.Root>
    </>
  );
};

export default EditModal;
