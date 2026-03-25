"use client";

import { useState } from "react";
import ImgDefaultServer from "@components/ui/imgDefault/ImgDefaultServer";
import type { ResponsivePictureSourceUrls } from "types/common";

/**
 * Minimal client component for the event hero image error fallback.
 * The <picture> element is server-rendered for faster LCP;
 * this wrapper only adds onError state to swap in a default image.
 */
export default function EventHeroImageClient({
  sources,
  safeTitle,
  title,
}: {
  sources: ResponsivePictureSourceUrls;
  safeTitle: string;
  title: string;
}) {
  const [hasFailed, setHasFailed] = useState(false);
  const sizes = "(max-width: 768px) 80vw, (max-width: 1280px) 70vw, 1200px";

  if (hasFailed) {
    return (
      <div className="absolute inset-0">
        <ImgDefaultServer title={title} />
      </div>
    );
  }

  return (
    <picture>
      <source srcSet={sources.webpSrcSet} type="image/webp" sizes={sizes} />
      <source srcSet={sources.avifSrcSet} type="image/avif" sizes={sizes} />
      <img
        src={sources.fallback}
        alt={safeTitle}
        loading="eager"
        decoding="sync"
        fetchPriority="high"
        sizes={sizes}
        className="object-cover w-full h-full absolute inset-0 z-10"
        onError={() => setHasFailed(true)}
      />
    </picture>
  );
}
