import { getTranslations } from "next-intl/server";
import RefreshSession from "./RefreshSession";

/**
 * Owner-gate fallback for an expired session: the owner check can't pass
 * until RefreshSession renews the token and re-renders the page.
 */
export default async function SessionRefreshNotice() {
  const t = await getTranslations("App.EventPromote");
  return (
    <main className="min-h-screen bg-background py-section-y px-section-x">
      <RefreshSession>
        <p className="max-w-3xl mx-auto text-center body-large text-foreground/80">
          {t("errors.AUTHENTICATION_REQUIRED")}
        </p>
      </RefreshSession>
    </main>
  );
}
