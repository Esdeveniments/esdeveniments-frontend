"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@i18n/routing";
import Modal from "@components/ui/common/modal";
import Button from "@components/ui/common/button";
import { sendGoogleEvent } from "@utils/analytics";
import type { PromoteUpsellModalProps } from "types/props";

export default function PromoteUpsellModal({
  open,
  setOpen,
  slug,
}: PromoteUpsellModalProps) {
  const t = useTranslations("App.Publish.promoteUpsell");
  const router = useRouter();

  const handlePromote = () => {
    sendGoogleEvent("promote_modal_cta_click", {
      event_slug: slug,
      source: "publica",
    });
    router.push(`/e/${slug}/promote`);
    // Explicitly returning false stops Modal's own setOpen(false) from racing
    // this navigation — see the design doc's "Modal" section for why this
    // matters (Modal calls setOpen(false) automatically unless told not to).
    return false;
  };

  const handleKeepFree = () => {
    sendGoogleEvent("promote_modal_dismiss", {
      event_slug: slug,
      source: "publica",
    });
    setOpen(false);
    router.push(`/e/${slug}`);
  };

  return (
    <Modal
      open={open}
      setOpen={setOpen}
      title={t("title")}
      actionButton={t("promoteButton")}
      onActionButtonClick={handlePromote}
      testId="promote-upsell-modal"
    >
      <div className="flex flex-col gap-4 py-4">
        <p className="body-normal text-foreground/80">{t("description")}</p>
        <Button
          type="button"
          variant="neutral"
          className="btn-outline w-full"
          data-testid="promote-modal-keep-free"
          onClick={handleKeepFree}
        >
          {t("keepFreeButton")}
        </Button>
      </div>
    </Modal>
  );
}
