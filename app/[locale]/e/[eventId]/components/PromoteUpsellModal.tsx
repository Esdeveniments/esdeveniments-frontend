"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@i18n/routing";
import { RocketLaunchIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
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
  // Reuses the promote page's own benefit copy (App.EventPromote.benefit1-3)
  // instead of duplicating the same three strings under a second namespace.
  const tPromote = useTranslations("App.EventPromote");
  const router = useRouter();

  const handlePromote = () => {
    sendGoogleEvent("promote_modal_cta_click", {
      event_slug: slug,
      source: "event_detail",
    });
    // Strip the one-time ?promote=1 marker from the *current* history entry
    // before navigating away, so a later browser-back to this event doesn't
    // re-open the modal. Uses a raw history replace (not router.replace) —
    // mirrors AuthEventTracker's marker-stripping — because a router.replace
    // immediately followed by the router.push below can have the push cancel
    // the replace's pending navigation in the App Router, leaving the marker
    // in place despite this call.
    const url = new URL(window.location.href);
    url.searchParams.delete("promote");
    window.history.replaceState(window.history.state, "", url);
    router.push(`/e/${slug}/promote`);
    // Explicitly returning false stops Modal's own setOpen(false) from racing
    // this navigation — see the design doc's "Modal" section for why this
    // matters (Modal calls setOpen(false) automatically unless told not to).
    return false;
  };

  const handleKeepFree = () => {
    sendGoogleEvent("promote_modal_dismiss", {
      event_slug: slug,
      source: "event_detail",
    });
    setOpen(false);
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
