"use client";

import { FC } from "react";
import dynamic from "next/dynamic";
import type { PromotionInfoModalProps } from "types/common";

// Lazy load generic modal to keep initial bundle light
const Modal = dynamic(() => import("@components/ui/common/modal"));

const PromotionInfoModal: FC<PromotionInfoModalProps> = ({ open, setOpen }) => {
  return (
    <Modal open={open} setOpen={setOpen} title="Promociona el teu restaurant">
      <div className="stack w-full pt-10 pb-2 px-4 text-left">
        <p className="text-sm leading-relaxed">
          Vols que el teu restaurant aparegui destacat aquí quan la gent mira un
          esdeveniment proper? Estem preparant el sistema de promocions.
        </p>
        <p className="text-sm leading-relaxed">
          De moment, envia&apos;ns un correu a{" "}
          <a
            href="mailto:hola@esdeveniments.cat?subject=Promocionar%20restaurant"
            className="underline text-primary hover:text-primary-dark break-all"
          >
            hola@esdeveniments.cat
          </a>{" "}
          amb:
        </p>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Nom del restaurant</li>
          <li>Població / Regió</li>
          <li>Enllaç (web o xarxes)</li>
          <li>Telèfon de contacte</li>
        </ul>
        <p className="text-xs text-foreground/70">
          T&apos;informarem tan aviat com les promocions automatitzades estiguin
          disponibles.
        </p>
      </div>
    </Modal>
  );
};

export default PromotionInfoModal;
