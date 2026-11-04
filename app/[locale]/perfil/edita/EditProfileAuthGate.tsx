"use client";

import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import type { EditProfileAuthGateProps } from "types/props";

const DEFAULT_REDIRECT = "/perfil/edita";

/**
 * Shown on /perfil/edita when the visitor isn't signed in. Mirrors
 * PublishAuthGate's shape (same gate-before-form rationale) with its own
 * copy and redirect target.
 */
export default function EditProfileAuthGate({
  redirectTo,
}: EditProfileAuthGateProps) {
  const t = useTranslations("App.EditProfile.authGate");
  const target = redirectTo || DEFAULT_REDIRECT;

  return (
    <div className="container flex-center pt-[6rem] pb-section-y">
      <div
        className="w-full max-w-md card-bordered card-body stack text-center"
        data-testid="edit-profile-auth-gate"
      >
        <div className="flex-center">
          <div className="flex-center w-14 h-14 rounded-full bg-primary/10 text-primary">
            <UserCircleIcon className="h-7 w-7" />
          </div>
        </div>

        <h1 className="heading-2 text-foreground">{t("title")}</h1>
        <p className="body-normal text-foreground/80">{t("description")}</p>

        <Link
          href={`/iniciar-sessio?redirect=${encodeURIComponent(target)}`}
          className="btn-primary w-full"
          data-analytics-action="edit_profile_gate_login"
        >
          {t("login")}
        </Link>
      </div>
    </div>
  );
}
