import { ImgDefaultProps } from "types/common";

/**
 * Single branded placeholder for events without images.
 *
 * Design rationale:
 * - One consistent look — no random-feeling colour variety
 * - Subtle brand-red tint (5-8 % opacity) reads as intentional
 * - Warm neutral base keeps cards visually light
 * - Matches competitors (Google, Apple, Eventbrite) who use a single
 *   neutral placeholder, not a rainbow palette
 */
const BRANDED_GRADIENT =
  "linear-gradient(135deg, rgba(214,0,47,0.06) 0%, rgba(214,0,47,0.03) 50%, rgba(240,235,232,0.8) 100%)";

const ImgDefaultCore: React.FC<ImgDefaultProps> = ({ title }) => {
  return (
    <div
      className="w-full h-full bg-muted"
      style={{
        backgroundImage: BRANDED_GRADIENT,
        minHeight: "100%",
      }}
      role={title ? "img" : "presentation"}
      aria-label={title || undefined}
      aria-hidden={!title}
    />
  );
};

export default ImgDefaultCore;
