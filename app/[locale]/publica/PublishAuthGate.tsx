"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { getPathname, Link } from "@i18n/routing";
import { useAuth } from "@components/hooks/useAuth";
import { PUBLISH_RESUME_PATH } from "@utils/constants";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

const REDIRECT = "/publica";

/**
 * Shown on /publica when the visitor isn't signed in. Publishing creates an
 * event attributed to the user (backend enforces auth and powers the
 * "events posted by users" feature), so — like Eventbrite / Luma / Meetup —
 * creation is gated upfront. Gating before the form means no wasted
 * form-filling, the friction a submit-time wall would cause.
 */
export default function PublishAuthGate() {
  const t = useTranslations("App.Publish.authGate");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const redirectTo = getPathname({
    href: searchParams.get("resume") === "1" ? PUBLISH_RESUME_PATH : REDIRECT,
    locale,
  });

  return (
    <div className="container flex-center pt-[6rem] pb-section-y">
      <div
        className="w-full max-w-md card-bordered card-body stack text-center"
        data-testid="publish-auth-gate"
      >
        <div className="flex-center">
          <div className="flex-center w-14 h-14 rounded-full bg-primary/10 text-primary">
            <PencilSquareIcon className="h-7 w-7" />
          </div>
        </div>

        <h1 className="heading-2 text-foreground">{t("title")}</h1>
        <p className="body-normal text-foreground/80">{t("description")}</p>

        <button
          type="button"
          onClick={() => signIn(redirectTo)}
          className="btn-primary w-full"
          data-analytics-action="publish_gate_login"
        >
          {t("login")}
        </button>

        <p className="body-small text-foreground/60">
          {t("noAccount")}{" "}
          <Link
            href={`/registre?redirect=${encodeURIComponent(REDIRECT)}`}
            className="text-primary font-semibold hover:underline"
            data-analytics-action="publish_gate_register"
          >
            {t("register")}
          </Link>
        </p>
      </div>
    </div>
  );
}
