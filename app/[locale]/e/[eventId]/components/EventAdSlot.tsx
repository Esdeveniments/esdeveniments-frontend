"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import { useAdContext } from "@lib/context/AdContext";
import { sendGoogleEvent } from "@utils/analytics";

// Only needed after consent, so it stays out of the page's first bundle.
const GoogleAdsenseContainer = dynamic(() => import("@components/ui/GoogleAdsense"), {
  ssr: false,
});

const EVENT_AD_SLOT = "9643657007";

/**
 * Reserve, then fill: the box keeps its height from the first paint and shows
 * our own "publish" card until (or unless) an ad fills it, so it is never an
 * empty "Contingut patrocinat" block. The height floor is a zero-width sibling
 * strut: AdSense resets `min-height` on every ancestor of the ad.
 */
export default function EventAdSlot() {
  const t = useTranslations("Components.EventPage");
  const { adsAllowed } = useAdContext();
  const [failed, setFailed] = useState(false);
  const showAd = adsAllowed && !failed;

  return (
    <section className="flex" aria-label={showAd ? t("sponsored") : undefined}>
      <div aria-hidden="true" className="w-0 min-h-[280px]" />
      <div className="flex-1 min-w-0 stack">
        {showAd ? (
          <>
            <p className="body-small text-muted-foreground px-4">{t("sponsored")}</p>
            <GoogleAdsenseContainer
              id={EVENT_AD_SLOT}
              slot={EVENT_AD_SLOT}
              format="auto"
              responsive
              style={{ textAlign: "initial" }}
              setDisplayAd={(display) => setFailed(!display)}
            />
          </>
        ) : (
          <div className="card-bordered" data-testid="event-house-ad">
            <div className="card-body stack items-start">
              <h2 className="heading-4">{t("houseAdTitle")}</h2>
              <p className="body-normal text-muted-foreground">{t("houseAdText")}</p>
              <Link
                href="/publica"
                prefetch={false}
                className="btn-outline"
                onClick={() => sendGoogleEvent("house_ad_click", { context: "event_page" })}
              >
                {t("houseAdCta")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
