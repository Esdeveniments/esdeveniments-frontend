"use client";

import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import type { CompleteProfileGateProps } from "types/props";

/**
 * Shown on /publica when the user is signed in but profileCompleted is
 * false. Proactive gate, before the whole event form is filled in — the
 * backend still enforces this itself (POST /api/events 403s), which
 * createEventAction catches as a fallback for the window between this check
 * and submit (e.g. stale client auth state).
 */
export default function CompleteProfileGate({
  redirectTo,
}: CompleteProfileGateProps) {
  const t = useTranslations("App.Publish.completeProfileGate");

  return (
    <div className="container flex-center pt-[6rem] pb-section-y">
      <div
        className="w-full max-w-md card-bordered card-body stack text-center"
        data-testid="complete-profile-gate"
      >
        <div className="flex-center">
          <div className="flex-center w-14 h-14 rounded-full bg-primary/10 text-primary">
            <UserCircleIcon className="h-7 w-7" />
          </div>
        </div>

        <h1 className="heading-2 text-foreground">{t("title")}</h1>
        <p className="body-normal text-foreground/80">{t("description")}</p>

        <Link
          href={`/perfil/edita?redirect=${encodeURIComponent(redirectTo)}`}
          className="btn-primary w-full"
          data-analytics-action="publish_complete_profile_gate"
        >
          {t("cta")}
        </Link>
      </div>
    </div>
  );
}
