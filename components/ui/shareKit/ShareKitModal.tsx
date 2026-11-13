"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Modal from "@components/ui/common/modal";
import { sendGoogleEvent } from "@utils/analytics";
import ShareKit from "./ShareKit";
import type { ShareKitModalProps } from "types/props";

export default function ShareKitModal({ open, setOpen, event, source }: ShareKitModalProps) {
  const t = useTranslations("Components.ShareKit");
  const shownRef = useRef(false);

  useEffect(() => {
    if (!open || shownRef.current) return;
    shownRef.current = true;
    sendGoogleEvent("share_kit_shown", { event_slug: event.slug, source });
  }, [open, event.slug, source]);

  return (
    <Modal open={open} setOpen={setOpen} title={t("modalTitle")} testId="share-kit-modal">
      <div className="py-4">
        <ShareKit event={event} source={source} description={t("modalDescription")} />
      </div>
    </Modal>
  );
}
