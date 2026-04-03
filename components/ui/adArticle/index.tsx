"use client";

import { useState, memo, FC } from "react";
import GoogleAdsenseContainer from "../GoogleAdsense";
import { AdArticleProps } from "types/common";

const AdArticle: FC<AdArticleProps> = memo(({ isDisplay = true, slot }) => {
  const [displayAd, setDisplayAd] = useState<boolean>(true);

  // When the ad fails to load (ad blocker, network error, etc.),
  // collapse the space entirely instead of showing an error box.
  // This avoids the ugly yellow "L'anunci no s'ha pogut carregar" banner
  // that damages perceived quality.
  if (!displayAd) return null;

  return (
    <div className="flex">
      <GoogleAdsenseContainer
        id={slot}
        slot={slot}
        format={isDisplay ? "auto" : "horizontal"}
        responsive={isDisplay}
        layout={!isDisplay ? "in-article" : undefined}
        style={{ textAlign: isDisplay ? "initial" : "center" }}
        setDisplayAd={setDisplayAd}
      />
    </div>
  );
});

AdArticle.displayName = "AdArticle";

export default AdArticle;
