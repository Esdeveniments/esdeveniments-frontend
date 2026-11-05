import { HERO_IMAGE } from "@config/hero-image";
import type { HomeHeroProps } from "types/props";

// Shared by the home page and its loading skeleton, so the hero image (the
// LCP element, preloaded by the page) paints before the backend answers.
export default function HomeHero({ children }: HomeHeroProps) {
  return (
    <div className="relative overflow-hidden border-b border-border/40 pb-8 pt-4">
      {/* Hero background image — uses <img> instead of CSS background-image
          so the browser can discover it early and apply fetchpriority="high" */}
      <picture>
        <source
          media={HERO_IMAGE.mobile.media}
          srcSet={HERO_IMAGE.mobile.srcSet}
          sizes={HERO_IMAGE.mobile.sizes}
          type={HERO_IMAGE.mobile.type}
        />
        <source
          media={HERO_IMAGE.mobile.media}
          srcSet={HERO_IMAGE.mobile.fallbackSrcSet}
          sizes={HERO_IMAGE.mobile.sizes}
          type="image/webp"
        />
        <img
          src={HERO_IMAGE.src}
          srcSet={HERO_IMAGE.desktop.srcSet}
          sizes={HERO_IMAGE.desktop.sizes}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-[center_60%]"
        />
      </picture>
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div className="container relative z-10">{children}</div>
    </div>
  );
}
