import { FC } from "react";
import Link from "next/link";
import Modal from "@components/ui/common/modal";
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
      <Modal
        open={openModal}
        setOpen={setOpenModal}
        title="Suggereix una edició"
      >
        <ul role="list" className="divide-y divide-darkCorp text-left">
          <li key="edit" className="p-4 flex">
            <Link href={`/e/${slug}/edita`} prefetch={false}>
              <div className="flex justify-center items-start gap-4">
                <PencilIcon
                  className="h-6 w-6 text-primary"
                  aria-hidden="true"
                />
                <div className="flex flex-col">
                  <p className="font-semibold">
                    Canvia el títol o altres detalls
                  </p>
                  <p className="text-sm">
                    Edita el títol, la ubicació, l&apos;horari, etc.
                  </p>
                </div>
              </div>
            </Link>
          </li>
          <li key="remove" className="p-4 flex">
            <button className="cursor-pointer" onClick={onRemove}>
              <div className="flex justify-center items-start gap-4">
                <XCircleIcon
                  className="h-6 w-6 text-primary"
                  aria-hidden="true"
                />
                <div className="flex flex-col">
                  <p className="font-semibold">Eliminar</p>
                  <p className="text-sm">
                    L&apos;esdeveniment no existeix, està duplicat, etc.
                  </p>
                </div>
              </div>
            </button>
          </li>
        </ul>
      </Modal>
      <Modal
        open={openDeleteReasonModal}
        setOpen={setOpenModalDeleteReasonModal}
        title="Suggereix una el·liminació"
      >
        <div className="flex flex-col">
          <div className="text-left text-sm px-4">
            <p>Motiu de l&apos;el·liminació suggerida</p>
          </div>
          <fieldset className="flex flex-col gap-4 py-4">
            <legend className="sr-only">Sol·licitud d&apos;eliminació</legend>
            <div className="flex justify-start items-center">
              <div className="p-2">
                <input
                  id="not-exist"
                  checked={reasonToDelete === "not-exist"}
                  onChange={() => setReasonToDelete("not-exist")}
                  aria-describedby="not-exist-description"
                  name="not-exist"
                  type="checkbox"
                  className="h-5 w-5 text-primarydark border-darkCorp rounded-xl focus:outline-none"
                />
              </div>
              <div className="p-2">
                <label htmlFor="not-exist" className="text-blackCorp">
                  No existeix
                </label>
              </div>
            </div>
            <div className="flex justify-start items-center">
              <div className="p-2">
                <input
                  id="duplicated"
                  checked={reasonToDelete === "duplicated"}
                  onChange={() => setReasonToDelete("duplicated")}
                  aria-describedby="duplicated-description"
                  name="duplicated"
                  type="checkbox"
                  className="h-5 w-5 text-primarydark border-darkCorp rounded-xl focus:outline-none"
                />
              </div>
              <div className="p-2">
                <label htmlFor="duplicated" className="text-blackCorp">
                  Duplicat
                </label>
              </div>
            </div>
            <div className="flex justify-start items-center">
              <div className="p-2">
                <input
                  id="offensive"
                  checked={reasonToDelete === "offensive"}
                  onChange={() => setReasonToDelete("offensive")}
                  aria-describedby="offensive-description"
                  name="offensive"
                  type="checkbox"
                  className="h-5 w-5 text-primarydark border-darkCorp rounded-xl focus:outline-none"
                />
              </div>
              <div className="p-2">
                <label htmlFor="offensive" className="text-blackCorp">
                  Ofensiu, nociu o enganyós
                </label>
              </div>
            </div>
            <div className="flex justify-start items-start text-left">
              <div className="p-2">
                <input
                  id="others"
                  checked={reasonToDelete === "others"}
                  onChange={() => setReasonToDelete("others")}
                  aria-describedby="others-description"
                  name="others"
                  type="checkbox"
                  className="h-5 w-5 text-primarydark border-darkCorp rounded-xl focus:outline-none"
                />
              </div>
              <div className="p-2">
                <label htmlFor="others" className="text-blackCorp">
                  Altres
                </label>
                <p id="offers-description" className="text-sm">
                  Envieu un correu amb el motiu a:{" "}
                  <a
                    className="hover:text-primary"
                    href="mailto:hola@esdeveniments.cat"
                  >
                    hola@esdeveniments.cat
                  </a>
                </p>
              </div>
            </div>
          </fieldset>
          <div className="flex justify-center py-4">
            <button
              disabled={!reasonToDelete}
              onClick={() => {
                if (reasonToDelete) {
                  onSendDeleteReason();
                }
              }}
              className="disabled:opacity-50 disabled:cursor-default disabled:hover:bg-primary text-whiteCorp bg-primary rounded-xl py-3 px-6 ease-in-out duration-300 border border-whiteCorp focus:outline-none font-barlow italic uppercase font-semibold tracking-wide"
            >
              Enviar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default EditModal;
