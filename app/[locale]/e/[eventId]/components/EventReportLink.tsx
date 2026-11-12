"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@components/hooks/useAuth";
import { contactEmail } from "@config/index";
import { isEventOwner } from "@utils/event-helpers";
import type { EventReportLinkProps } from "types/props";

/**
 * Anyone can publish now, so readers need a way to flag wrong or abusive
 * events. Owners edit instead, so they don't see it.
 */
export default function EventReportLink({ ownerId, title, url }: EventReportLinkProps) {
  const t = useTranslations("Components.EventPage");
  const { user } = useAuth();
  if (isEventOwner(user?.id, ownerId)) return null;

  const subject = encodeURIComponent(t("reportSubject", { title }));
  const body = encodeURIComponent(t("reportBody", { url }));

  return (
    <p className="body-small text-muted-foreground px-4" data-testid="event-report">
      {t("reportPrompt")}{" "}
      <a
        href={`mailto:${contactEmail}?subject=${subject}&body=${body}`}
        className="font-semibold text-foreground-strong underline hover:text-primary"
      >
        {t("reportLink")}
      </a>
    </p>
  );
}
