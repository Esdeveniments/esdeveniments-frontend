"use client";

import { FC } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import type { PromotionInfoModalProps } from "types/common";
import { contactEmail } from "@config/index";

// Lazy load generic modal to keep initial bundle light
const Modal = dynamic(() => import("@components/ui/common/modal"));

const PromotionInfoModal: FC<PromotionInfoModalProps> = ({ open, setOpen }) => {
  const t = useTranslations("Components.PromotionInfoModal");
  const promotionEmailSubject = t("contactSubject");
  const promotionEmailHref = `mailto:${contactEmail}?subject=${encodeURIComponent(
    promotionEmailSubject
  )}`;
  return (
    <Modal open={open} setOpen={setOpen} title={t("title")}>
      <div className="stack w-full pt-10 pb-2 px-4 text-left">
        <p className="text-sm leading-relaxed">
          {t("intro1")}
        </p>
        <p className="text-sm leading-relaxed">
          {t.rich("intro2", {
            email: (chunks) => (
              <a
                href={promotionEmailHref}
                className="underline text-primary hover:text-primary-dark break-all"
              >
                {chunks}
              </a>
            ),
            contactEmail,
          })}
        </p>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>{t("itemName")}</li>
          <li>{t("itemPlace")}</li>
          <li>{t("itemLink")}</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          {t("footer")}
        </p>
      </div>
    </Modal>
  );
};

export default PromotionInfoModal;
