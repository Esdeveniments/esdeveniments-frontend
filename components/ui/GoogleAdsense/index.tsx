import { useEffect, useRef, useState, CSSProperties, JSX } from "react";
import { AdStatus, GoogleAdsenseContainerProps } from "types/common";
import { getSanitizedErrorMessage } from "@utils/api-error-handler";

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
  const viewObserver = useRef<IntersectionObserver | null>(null);
  const callbackRef = useRef(setDisplayAd);
  const [hasConsent, setHasConsent] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (typeof window.__tcfapi !== "function") return true;
    return Boolean(window.__adsConsentGranted);
  });
  const [shouldRenderSlot, setShouldRenderSlot] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return typeof IntersectionObserver === "undefined";
  });
  const slotPushed = useRef(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = setDisplayAd;
  }, [setDisplayAd]);

  useEffect(() => {
    const handleConsent = (event: Event) => {
      const allowed = (event as CustomEvent<{ allowed?: boolean }>).detail
        ?.allowed;
      setHasConsent(Boolean(allowed));
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        "ads-consent-changed",
        handleConsent as EventListener
      );
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "ads-consent-changed",
          handleConsent as EventListener
        );
      }
    };
  }, []);

  useEffect(() => {
    if (!hasConsent) {
      callbackRef.current?.(false);
    }
  }, [hasConsent]);

  useEffect(() => {
    if (!hasConsent || shouldRenderSlot) return;
    const target = wrapperRef.current;
    if (!target) return;

    viewObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldRenderSlot(true);
          }
        });
      },
      { rootMargin: "0px 0px 320px 0px" }
    );

    viewObserver.current.observe(target);

    return () => viewObserver.current?.disconnect();
  }, [hasConsent, shouldRenderSlot]);

  // Safety: if the observer never fires (e.g., zero-height target), render anyway after a short delay.
  useEffect(() => {
    if (!hasConsent || shouldRenderSlot) return;
    const timer = setTimeout(() => setShouldRenderSlot(true), 1200);
    return () => clearTimeout(timer);
  }, [hasConsent, shouldRenderSlot]);

  useEffect(() => {
    if (!shouldRenderSlot || !hasConsent) return;
    if (fallbackTimer.current) {
      clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }

    if (
      adRef.current &&
      adRef.current.children &&
      adRef.current.children.length > 0
    ) {
      return; // Ad already loaded in this element, return early
    }

    try {
      if (slotPushed.current) return;
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      slotPushed.current = true;
    } catch (err) {
      console.error("adsense error", getSanitizedErrorMessage(err));
      callbackRef.current?.(false);
    }

    // Fallback: if no status arrives within a few seconds, show fallback content
    fallbackTimer.current = setTimeout(() => {
      const status = adRef.current?.getAttribute("data-ad-status");
      const hasChildren =
        !!adRef.current?.children && adRef.current.children.length > 0;
      if (status === "filled" || hasChildren) return;
      callbackRef.current?.(false);
    }, 6000);
  }, [hasConsent, shouldRenderSlot]);

  useEffect(() => {
    if (!shouldRenderSlot || !hasConsent) return;
    const callback = (mutationsList: MutationRecord[]): void => {
      mutationsList.forEach((element) => {
        const target = element.target as HTMLElement;
        const adStatus = target.getAttribute("data-ad-status") as AdStatus;
        if (adStatus === "filled") {
          callbackRef.current?.(true);
          if (fallbackTimer.current) {
            clearTimeout(fallbackTimer.current);
            fallbackTimer.current = null;
          }
        } else if (adStatus === "unfilled") {
          callbackRef.current?.(false);
          if (fallbackTimer.current) {
            clearTimeout(fallbackTimer.current);
            fallbackTimer.current = null;
          }
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

    return () => {
      observer.current?.disconnect();
      if (fallbackTimer.current) {
        clearTimeout(fallbackTimer.current);
        fallbackTimer.current = null;
      }
    };
  }, [hasConsent, shouldRenderSlot]);

  return (
    <div ref={wrapperRef} className="w-full min-h-[1px]">
      {hasConsent && shouldRenderSlot && (
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
      )}
    </div>
  );
};

export default GoogleAdsenseContainer;
