"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@i18n/routing";
import ConfirmDialog from "@components/ui/common/confirmDialog";
import { sendGoogleEvent } from "@utils/analytics";
import type { EventDeleteDialogProps } from "types/props";

/**
 * Confirmation step for deleting an event, opened from the owner bar's menu.
 * `DELETE /api/events/[slug]` checks ownership and purges the caches.
 */
export default function EventDeleteDialog({ slug, open, setOpen }: EventDeleteDialogProps) {
  const t = useTranslations("Components.EventPage");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // A retry after closing starts without the previous error.
  const handleOpenChange = (next: boolean) => {
    if (!next) setFailed(false);
    setOpen(next);
  };

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
    <ConfirmDialog
      open={open}
      setOpen={handleOpenChange}
      title={t("deleteConfirmTitle")}
      description={t("deleteConfirmDescription")}
      confirmLabel={t("deleteConfirm")}
      cancelLabel={t("deleteCancel")}
      busy={busy}
      error={failed ? t("deleteError") : undefined}
      testId="event-delete-modal"
      onConfirm={handleDelete}
    />
  );
}
