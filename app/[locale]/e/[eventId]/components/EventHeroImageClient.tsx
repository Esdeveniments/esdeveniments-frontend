"use client";

import { useState } from "react";
import ImgDefaultServer from "@components/ui/imgDefault/ImgDefaultServer";
import type { ResponsivePictureSourceUrls } from "types/common";
import { getOptimalImageSizes } from "@utils/image-quality";

/**
 * Minimal client component for the event hero image error fallback.
 * The <picture> element is server-rendered for faster LCP;
 * this wrapper only adds onError state to swap in a default image.
 */
export default function EventHeroImageClient({
  sources,
  directSrc,
  safeTitle,
  title,
}: {
  sources: ResponsivePictureSourceUrls;
  /** The original HTTPS URL, tried once when the proxy fails. */
  directSrc: string;
  safeTitle: string;
  title: string;
}) {
  const [stage, setStage] = useState<"proxy" | "direct" | "failed">("proxy");
  const sizes = getOptimalImageSizes("detail");
  const handleError = () =>
    setStage(stage === "proxy" && directSrc ? "direct" : "failed");

  if (stage === "failed") {
    return (
      <div className="absolute inset-0">
        <ImgDefaultServer title={title} />
      </div>
    );
  }

  // The proxy failed: the browser loads the original (some council servers
  // only accept connections from Spain, which the proxy's server isn't in).
  if (stage === "direct") {
    return (
      <>
        <picture>
          <img
            src={directSrc}
            alt=""
            decoding="async"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
          />
        </picture>
        <picture>
          <img
            src={directSrc}
            alt={safeTitle}
            decoding="async"
            className="object-contain w-full h-full absolute inset-0 z-10"
            onError={handleError}
          />
        </picture>
      </>
    );
  }

  // Half of our covers are portrait posters: show the whole image, and fill
  // the box with a blurred copy (same URL, downloaded once). Fixed box = no CLS.
  return (
    <>
      <picture>
        <source srcSet={sources.webpSrcSet} type="image/webp" sizes={sizes} />
        <img
          src={sources.fallback}
          alt=""
          loading="eager"
          decoding="async"
          sizes={sizes}
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
        />
      </picture>
      <picture>
        <source srcSet={sources.webpSrcSet} type="image/webp" sizes={sizes} />
        <img
          src={sources.fallback}
          alt={safeTitle}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          sizes={sizes}
          className="object-contain w-full h-full absolute inset-0 z-10"
          onError={handleError}
        />
      </picture>
    </>
  );
}
