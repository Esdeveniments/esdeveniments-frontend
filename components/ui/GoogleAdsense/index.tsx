import { useEffect, useRef, CSSProperties, JSX } from "react";

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    adsbygoogle: any[];
  }
}

type AdStatus = "unfilled" | "filled";

interface GoogleAdsenseContainerProps {
  id: string;
  style?: CSSProperties;
  layout?: "horizontal" | "vertical" | "in-article" | "in-feed";
  format?: "auto" | "rectangle" | "vertical" | "horizontal";
  responsive?: boolean;
  slot: string;
  // eslint-disable-next-line no-unused-vars
  setDisplayAd?: (display: boolean) => void;
  adClient?: string;
}

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
          setDisplayAd?.(false);
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
  }, [setDisplayAd, style, layout, format, responsive, slot]);

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
