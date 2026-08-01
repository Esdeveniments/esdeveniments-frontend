import { getTranslations } from "next-intl/server";
import { Link } from "@i18n/routing";
import { UserCircleIcon } from "@heroicons/react/24/outline";

// Shown on /preferits/passats to anonymous visitors — past favourites are
// authenticated-only. Server-rendered (unlike EditProfileAuthGate): the
// redirect target here is always /preferits/passats, so there's no need for
// a client-side useSearchParams()/useAuth() round trip.
export default async function PastFavoritesAuthGate() {
  const t = await getTranslations("App.Favorites");

  return (
    <div
      className="w-full max-w-md card-bordered card-body stack text-center"
      data-testid="preferits-passats-auth-gate"
    >
      <div className="flex-center">
        <div className="flex-center w-14 h-14 rounded-full bg-primary/10 text-primary">
          <UserCircleIcon className="h-7 w-7" />
        </div>
      </div>

      {/* h3, not h1: app/[locale]/preferits/layout.tsx already renders the
          page's h1 ("Preferits"); NoEventsFound (this page's error/empty
          states) uses h3 for its own in-page heading, so this matches that
          convention instead of EditProfileAuthGate's h1 — that component has
          no wrapping layout heading, so h1 is correct there but would be a
          second h1 on this page. */}
      <h3 className="heading-2 text-foreground">{t("pastAuthGateTitle")}</h3>
      <p className="body-normal text-foreground/80">
        {t("pastAuthGateDescription")}
      </p>

      <Link
        href="/iniciar-sessio?redirect=%2Fpreferits%2Fpassats"
        className="btn-primary w-full"
        data-analytics-action="preferits_passats_gate_login"
      >
        {t("pastAuthGateLogin")}
      </Link>
    </div>
  );
}
