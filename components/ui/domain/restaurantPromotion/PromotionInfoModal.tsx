"use client";

import { FC } from "react";
import { Modal, Text } from "@components/ui/primitives";
import type { PromotionInfoModalProps } from "types/common";

const PromotionInfoModal: FC<PromotionInfoModalProps> = ({ open, setOpen }) => {
  return (
    <Modal
      isOpen={open}
      onClose={() => setOpen(false)}
      title="Promociona el teu restaurant"
    >
      <div className="flex w-full flex-col gap-component-md px-component-md pb-component-xs pt-2xl text-left">
        <Text as="p" variant="body-sm" className="leading-relaxed">
          Vols que el teu restaurant aparegui destacat aquí quan la gent mira un
          esdeveniment proper? Estem preparant el sistema de promocions.
        </Text>
        <Text as="p" variant="body-sm" className="leading-relaxed">
          De moment, envia&apos;ns un correu a{" "}
          <a
            href="mailto:hola@esdeveniments.cat?subject=Promocionar%20restaurant"
            className="break-all text-primary underline hover:text-primarydark"
          >
            hola@esdeveniments.cat
          </a>{" "}
          amb:
        </Text>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <Text variant="body-sm">Nom del restaurant</Text>
          </li>
          <li>
            <Text variant="body-sm">Població / Regió</Text>
          </li>
          <li>
            <Text variant="body-sm">Enllaç (web o xarxes)</Text>
          </li>
          <li>
            <Text variant="body-sm">Telèfon de contacte</Text>
          </li>
        </ul>
        <Text as="p" variant="caption">
          T&apos;informarem tan aviat com les promocions automatitzades estiguin
          disponibles.
        </Text>
      </div>
    </Modal>
  );
};

export default PromotionInfoModal;
