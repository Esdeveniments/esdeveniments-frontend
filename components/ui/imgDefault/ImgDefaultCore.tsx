import { ImgDefaultProps } from "types/common";

// Brand ticket illustration (public/static/images/tickets-line.svg) in brand red.
const PLACEHOLDER_ILLUSTRATION = "/static/images/tickets-placeholder.svg";

/**
 * Single branded placeholder for events without images.
 *
 * Design rationale:
 * - One consistent look — no random-feeling colour variety
 * - Subtle brand-red tint (5-8 % opacity) plus the brand tickets drawing reads as
 *   intentional brand art (Meetup fills the slot the same way), not as an
 *   image that failed to load
 * - Warm neutral base keeps cards visually light
 */
const BRANDED_GRADIENT =
  "linear-gradient(135deg, rgba(214,0,47,0.06) 0%, rgba(214,0,47,0.03) 50%, rgba(240,235,232,0.8) 100%)";

// A static file, not an inline sprite: cached once instead of adding ~5 KB to
// every page's HTML. A CSS background, so the only <img> on a card is a real
// event image.
const PLACEHOLDER_STYLE: React.CSSProperties = {
  backgroundImage: `url(${PLACEHOLDER_ILLUSTRATION}), ${BRANDED_GRADIENT}`,
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "min(50%, 6rem) auto, 100% 100%",
  minHeight: "100%",
};

const ImgDefaultCore: React.FC<ImgDefaultProps> = ({ title }) => {
  return (
    <div
      className="w-full h-full bg-muted"
      style={PLACEHOLDER_STYLE}
      role={title ? "img" : "presentation"}
      aria-label={title || undefined}
      aria-hidden={!title}
    />
  );
};

export default ImgDefaultCore;
