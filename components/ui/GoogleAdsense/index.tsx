import { useEffect, useRef, CSSProperties, JSX } from "react";
import { AdStatus, GoogleAdsenseContainerProps } from "types/common";

const GoogleAdsenseContainer = ({
  id,
  style,
  layout,
  format,
  responsive,
  slot,
  setDisplayAd,
  adClient,
}: GoogleAdsenseContainerProps): JSX.Element => {
  const adRef = useRef<HTMLModElement>(null);
  const observer = useRef<MutationObserver | null>(null);
  const callbackRef = useRef(setDisplayAd);

  useEffect(() => {
    callbackRef.current = setDisplayAd;
  }, [setDisplayAd]);

  useEffect(() => {
    if (
      adRef.current &&
      adRef.current.children &&
      adRef.current.children.length > 0
    ) {
      return; // Ad already loaded in this element, return early
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error(
        "adsense error",
        err instanceof Error ? err.message : String(err)
      );
    }
  }, []);

  useEffect(() => {
    const callback = (mutationsList: MutationRecord[]): void => {
      mutationsList.forEach((element) => {
        const target = element.target as HTMLElement;
        const adStatus = target.getAttribute("data-ad-status") as AdStatus;
        if (adStatus === "unfilled") {
          callbackRef.current?.(false);
        }
      });
    };

    if (!observer.current) {
      observer.current = new MutationObserver(callback);
    }

    if (adRef.current) {
      observer.current.observe(adRef.current, {
        attributeFilter: ["data-ad-status"],
        attributes: true,
      });
    }

    return () => observer.current?.disconnect();
  }, []);

  return (
    <ins
      id={id}
      ref={adRef}
      className="adsbygoogle w-full"
      style={
        {
          display: "block",
          position: "relative",
          zIndex: 0,
          ...style,
        } as CSSProperties
      }
      data-ad-client={adClient || process.env.NEXT_PUBLIC_GOOGLE_ADS}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive}
      data-ad-layout={layout}
    />
  );
};

export default GoogleAdsenseContainer;
