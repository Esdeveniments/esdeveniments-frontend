"use client";
import { FC } from "react";
import { useTranslations } from "next-intl";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
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
  const t = useTranslations("Components.EditModal");

  return (
    <>
      <Modal
        open={openModal}
        setOpen={setOpenModal}
        title={t("title")}
      >
        <ul role="list" className="divide-y divide-foreground-strong text-left">
          <li key="edit" className="p-4 flex">
            <PressableAnchor
              href={`/e/${slug}/edita`}
              prefetch={false}
              variant="inline"
            >
              <div className="flex justify-center items-start gap-4">
                <PencilIcon
                  className="h-6 w-6 text-primary"
                  aria-hidden="true"
                />
                <div className="flex flex-col">
                  <p className="font-semibold">{t("editTitle")}</p>
                  <p className="text-sm">{t("editDescription")}</p>
                </div>
              </div>
            </PressableAnchor>
          </li>
          <li key="remove" className="p-4 flex">
            <button className="cursor-pointer" onClick={onRemove}>
              <div className="flex justify-center items-start gap-4">
                <XCircleIcon
                  className="h-6 w-6 text-primary"
                  aria-hidden="true"
                />
                <div className="flex flex-col">
                  <p className="font-semibold">{t("removeTitle")}</p>
                  <p className="text-sm">{t("removeDescription")}</p>
                </div>
              </div>
            </button>
          </li>
        </ul>
      </Modal>
      <Modal
        open={openDeleteReasonModal}
        setOpen={setOpenModalDeleteReasonModal}
        title={t("deleteTitle")}
      >
        <div className="flex flex-col">
          <div className="text-left text-sm px-4">
            <p>{t("deleteReasonPrompt")}</p>
          </div>
          <fieldset className="flex flex-col gap-4 py-4">
            <legend className="sr-only">{t("deleteLegend")}</legend>
            <div className="flex justify-start items-center">
              <div className="p-2">
                <input
                  id="not-exist"
                  checked={reasonToDelete === "not-exist"}
                  onChange={() => setReasonToDelete("not-exist")}
                  aria-describedby="not-exist-description"
                  name="not-exist"
                  type="checkbox"
                  className="h-5 w-5 text-primary-dark border-foreground-strong rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                />
              </div>
              <div className="p-2">
                <label htmlFor="not-exist" className="text-foreground-strong">
                  {t("reason.notExist")}
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
                  className="h-5 w-5 text-primary-dark border-foreground-strong rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                />
              </div>
              <div className="p-2">
                <label htmlFor="duplicated" className="text-foreground-strong">
                  {t("reason.duplicated")}
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
                  className="h-5 w-5 text-primary-dark border-foreground-strong rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                />
              </div>
              <div className="p-2">
                <label htmlFor="offensive" className="text-foreground-strong">
                  {t("reason.offensive")}
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
                  className="h-5 w-5 text-primary-dark border-foreground-strong rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                />
              </div>
              <div className="p-2">
                <label htmlFor="others" className="text-foreground-strong">
                  {t("reason.others")}
                </label>
                <p id="offers-description" className="text-sm">
                  {t("reason.othersDescription")}{" "}
                  <a
                    className="hover:text-primary"
                    href="mailto:hola@esdeveniments.cat"
                  >
                    {t("reason.othersEmail")}
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
              className="disabled:opacity-50 disabled:cursor-default disabled:hover:bg-primary text-background bg-primary rounded-xl py-3 px-6 ease-in-out duration-300 border border-background focus:outline-none font-barlow uppercase font-semibold tracking-wide"
            >
              {t("submit")}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default EditModal;
