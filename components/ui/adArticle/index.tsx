import { useState, memo, lazy, Suspense, FC } from "react";
import GoogleAdsenseContainer from "../GoogleAdsense";

const AdBoard = lazy(() => import("../adBoard"));

interface AdArticleProps {
  isDisplay?: boolean;
  slot: string;
}

const AdArticle: FC<AdArticleProps> = memo(({ isDisplay = true, slot }) => {
  const [displayAd, setDisplayAd] = useState<boolean>(true);

  if (!displayAd)
    return (
      <Suspense fallback={<div>Loading Ad...</div>}>
        <AdBoard />
      </Suspense>
    );

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
