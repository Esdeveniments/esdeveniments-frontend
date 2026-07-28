"use client";

import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import { PencilIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@components/hooks/useAuth";
import type { EventEditActionProps } from "types/props";

/**
 * Owner-only edit link for the event detail sidebar. Client-side check
 * (not a server-side getCurrentUser() call) so a page view doesn't pay for
 * a backend enrichment round-trip just to decide whether to show this link —
 * it reuses the session AuthProvider already fetches once for the whole app.
 */
export default function EventEditAction({ ownerId, slug }: EventEditActionProps) {
  const { user } = useAuth();
  const t = useTranslations("Components.EventPage");

  if (!ownerId || user?.id !== ownerId) return null;

  return (
    <Link
      href={`/e/${slug}/edita`}
      className="inline-flex items-center gap-2 btn-outline btn-sm"
      data-testid="event-edit-link"
    >
      <PencilIcon className="w-4 h-4" aria-hidden="true" />
      {t("editEvent")}
    </Link>
  );
}
