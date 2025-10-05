import { useState, memo, lazy, JSX } from "react";
import GoogleAdsenseContainer from "../GoogleAdsense";
import { Skeleton, Text } from "@components/ui/primitives";
import { AdContentProps } from "types/common";

const AdBoard = lazy(() => import("../adBoard"));

const AdContent = ({ children }: AdContentProps): JSX.Element => (
  <>
    <div className="flex w-full cursor-pointer flex-col justify-center overflow-hidden bg-whiteCorp">
      <div className="flex h-fit items-start gap-component-xs bg-whiteCorp pb-component-xs pr-component-md">
        <div className="m-xs flex items-center justify-start gap-xs pt-[2px]">
          <div className="h-6 w-2 bg-gradient-to-r from-primary to-primarydark"></div>
        </div>
        <Text as="h3" variant="h3" className="w-11/12 uppercase">
          Contingut patrocinat
        </Text>
      </div>
    </div>
    <div className="flex items-center justify-center px-component-md pb-2xl pt-component-md">
      {children}
    </div>
  </>
);

const AdCard = (): JSX.Element => {
  const [displayAd, setDisplayAd] = useState<boolean | undefined>(true);

  if (displayAd === undefined) return <Skeleton variant="card" />;

  if (!displayAd)
    return (
      <AdContent>
        <AdBoard />
      </AdContent>
    );

  return (
    <AdContent>
      <GoogleAdsenseContainer
        id="ad-card-slot"
        slot="9209662295"
        responsive
        setDisplayAd={setDisplayAd}
      />
    </AdContent>
  );
};

export default memo(AdCard);
