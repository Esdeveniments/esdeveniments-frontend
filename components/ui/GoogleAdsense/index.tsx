import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  CSSProperties,
  JSX,
} from "react";
import { AdStatus, GoogleAdsenseContainerProps } from "types/common";
import { getSanitizedErrorMessage } from "@utils/api-error-handler";
import { useAdContext } from "../../../lib/context/AdContext";

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
  const {
    adsAllowed,
    observeVisibility,
    unobserveVisibility,
    observeMutations,
    unobserveMutations,
  } = useAdContext();

  const adRef = useRef<HTMLModElement>(null);

  // useEffectEvent ensures we always call the latest setDisplayAd callback
  // without needing to track it in a ref or add it to effect dependencies
  const onDisplayAdChange = useEffectEvent((display: boolean) => {
    setDisplayAd?.(display);
  });

  // Initialize shouldRenderSlot based on environment
  const [shouldRenderSlot, setShouldRenderSlot] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    // If IntersectionObserver is not supported, render immediately
    return typeof IntersectionObserver === "undefined";
  });

  const slotPushed = useRef(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If consent is revoked, hide ad
  useEffect(() => {
    if (!adsAllowed) {
      onDisplayAdChange(false);
    }
  }, [adsAllowed]);

  // Visibility Observer
  useEffect(() => {
    if (!adsAllowed || shouldRenderSlot) return;
    const target = wrapperRef.current;
    if (!target) return;

    observeVisibility(target, () => {
      setShouldRenderSlot(true);
    });

    return () => {
      unobserveVisibility(target);
    };
  }, [adsAllowed, shouldRenderSlot, observeVisibility, unobserveVisibility]);

  // Safety fallback if observer never fires
  useEffect(() => {
    if (!adsAllowed || shouldRenderSlot) return;
    const timer = setTimeout(() => setShouldRenderSlot(true), 1200);
    return () => clearTimeout(timer);
  }, [adsAllowed, shouldRenderSlot]);

  // Push Ad
  useEffect(() => {
    if (!shouldRenderSlot || !adsAllowed) return;
    if (fallbackTimer.current) {
      clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }

    if (
      adRef.current &&
      adRef.current.children &&
      adRef.current.children.length > 0
    ) {
      return; // Ad already loaded
    }

    try {
      if (slotPushed.current) return;
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      slotPushed.current = true;
    } catch (err) {
      console.error("adsense error", getSanitizedErrorMessage(err));
      onDisplayAdChange(false);
    }

    // Fallback: if no status arrives within a few seconds, show fallback content
    fallbackTimer.current = setTimeout(() => {
      const status = adRef.current?.getAttribute("data-ad-status");
      const hasChildren =
        !!adRef.current?.children && adRef.current.children.length > 0;
      if (status === "filled" || hasChildren) return;
      onDisplayAdChange(false);
    }, 6000);
  }, [adsAllowed, shouldRenderSlot]);

  // Mutation Observer (Ad Status)
  useEffect(() => {
    if (!shouldRenderSlot || !adsAllowed || !adRef.current) return;

    const target = adRef.current;

    const handleMutations = (mutationsList: MutationRecord[]) => {
      mutationsList.forEach((element) => {
        const targetEl = element.target as HTMLElement;
        const adStatus = targetEl.getAttribute("data-ad-status") as AdStatus;
        if (adStatus === "filled") {
          onDisplayAdChange(true);
          if (fallbackTimer.current) {
            clearTimeout(fallbackTimer.current);
            fallbackTimer.current = null;
          }
        } else if (adStatus === "unfilled") {
          onDisplayAdChange(false);
          if (fallbackTimer.current) {
            clearTimeout(fallbackTimer.current);
            fallbackTimer.current = null;
          }
        }
      });
    };

    observeMutations(target, handleMutations);

    return () => {
      unobserveMutations(target);
      if (fallbackTimer.current) {
        clearTimeout(fallbackTimer.current);
        fallbackTimer.current = null;
      }
    };
  }, [adsAllowed, shouldRenderSlot, observeMutations, unobserveMutations]);

  return (
    <div ref={wrapperRef} className="w-full min-h-[1px]">
      {adsAllowed && shouldRenderSlot && (
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
