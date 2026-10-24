// Home hero (the LCP image). The <picture> in serverEventsCategorized and the
// preload links in app/[locale]/page.tsx must use these same values, or the
// browser downloads the hero twice.
//
// Phones up to 440px wide get a 1152x1080 centre crop: their hero box is about
// square, so object-cover already hid the sides of the 16:9 image. `sizes`
// covers the box height too (~410-440px), because object-cover scales by
// height on narrow boxes.
export const HERO_IMAGE = {
  src: "/static/images/hero-castellers.webp",
  mobile: {
    media: "(max-width: 440px)",
    srcSet:
      "/static/images/hero-castellers-m800.webp 800w, /static/images/hero-castellers-m1152.webp 1152w",
    sizes: "max(100vw, 440px)",
  },
  desktop: {
    media: "(min-width: 441px)",
    srcSet:
      "/static/images/hero-castellers-1280.webp 1280w, /static/images/hero-castellers.webp 1920w",
    sizes: "max(100vw, 730px)",
  },
} as const;
