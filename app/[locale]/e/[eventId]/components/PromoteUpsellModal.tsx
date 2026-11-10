"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@i18n/routing";
import { RocketLaunchIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import Modal from "@components/ui/common/modal";
import Button from "@components/ui/common/button";
import ShareKit from "@components/ui/shareKit/ShareKit";
import { sendGoogleEvent } from "@utils/analytics";
import type { PromoteUpsellModalProps } from "types/props";

// Drops ?promote=1 so a back navigation or a tab reload doesn't reopen the
// modal. A raw history replace, because router.replace + router.push can
// cancel each other. EventClient keeps the modal open once it has shown.
function removePromoteMarker() {
  const url = new URL(window.location.href);
  url.searchParams.delete("promote");
  window.history.replaceState(window.history.state, "", url);
}

export default function PromoteUpsellModal({
  open,
  setOpen,
  slug,
  shareEvent,
}: PromoteUpsellModalProps) {
  const t = useTranslations("App.Publish.promoteUpsell");
  const tPromote = useTranslations("App.EventPromote");
  const router = useRouter();
  // Promotion pays the bills, so it comes first; sharing is offered only
  // after the organiser declines it.
  const [step, setStep] = useState<"promote" | "share">("promote");

  const handlePromote = () => {
    sendGoogleEvent("promote_modal_cta_click", {
      event_slug: slug,
      source: "event_detail",
    });
    removePromoteMarker();
    router.push(`/e/${slug}/promote`);
    // false stops Modal's own setOpen(false) from racing this navigation.
    return false;
  };

  const handleKeepFree = () => {
    sendGoogleEvent("promote_modal_dismiss", {
      event_slug: slug,
      source: "event_detail",
    });
    sendGoogleEvent("share_kit_shown", { event_slug: slug, source: "post_publish" });
    // The organiser may switch to WhatsApp and the phone may reload the tab;
    // without the marker they come back to the event, not to the promote step.
    removePromoteMarker();
    setStep("share");
  };

  if (step === "share") {
    return (
      <Modal open={open} setOpen={setOpen} title={t("shareTitle")} testId="promote-upsell-modal">
        <div className="py-4">
          <ShareKit
            event={shareEvent}
            source="post_publish"
            description={t("shareDescription")}
          />
        </div>
      </Modal>
    );
  }

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
        <div className="flex justify-center">
          <div className="flex-center w-14 h-14 rounded-full bg-primary/10 text-primary">
            <RocketLaunchIcon className="w-8 h-8" aria-hidden="true" />
          </div>
        </div>
        <p className="body-normal text-foreground/80 text-center">
          {t("description")}
        </p>
        <ul className="flex flex-col gap-2 body-small text-foreground/80">
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
            {tPromote("benefit1")}
          </li>
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
            {tPromote("benefit2")}
          </li>
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
            {tPromote("benefit3")}
          </li>
        </ul>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          data-testid="promote-modal-keep-free"
          onClick={handleKeepFree}
        >
          {t("keepFreeButton")}
        </Button>
      </div>
    </Modal>
  );
}
