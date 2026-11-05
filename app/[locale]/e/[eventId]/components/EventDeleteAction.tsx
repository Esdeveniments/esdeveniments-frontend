"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useRouter } from "@i18n/routing";
import ConfirmDialog from "@components/ui/common/confirmDialog";
import { sendGoogleEvent } from "@utils/analytics";
import type { EventDeleteActionProps } from "types/props";

/**
 * Delete button with a confirmation step. `DELETE /api/events/[slug]` checks
 * ownership and purges the caches.
 */
export default function EventDeleteAction({ slug }: EventDeleteActionProps) {
  const t = useTranslations("Components.EventPage");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleDelete = async (): Promise<boolean> => {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        credentials: "include",
      });
      // Not even a 404 counts as success: the route also returns it when the
      // backend lookup fails, so the event may still be live.
      if (!response.ok) {
        setFailed(true);
        sendGoogleEvent("event_delete_error", { status: response.status });
        return false;
      }
    } catch {
      setFailed(true);
      sendGoogleEvent("event_delete_error", { status: 0 });
      return false;
    } finally {
      setBusy(false);
    }
    sendGoogleEvent("event_delete_success", { event_slug: slug });
    router.replace("/");
    return true;
  };

  return (
    <>
      <button
        type="button"
        className="btn-outline"
        onClick={() => {
          setFailed(false);
          setOpen(true);
        }}
        data-testid="event-delete-button"
      >
        <TrashIcon className="w-4 h-4" aria-hidden="true" />
        {t("deleteEvent")}
      </button>
      <ConfirmDialog
        open={open}
        setOpen={setOpen}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDescription")}
        confirmLabel={t("deleteConfirm")}
        cancelLabel={t("deleteCancel")}
        busy={busy}
        error={failed ? t("deleteError") : undefined}
        testId="event-delete-modal"
        onConfirm={handleDelete}
      />
    </>
  );
}
