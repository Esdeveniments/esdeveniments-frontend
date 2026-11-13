import { ImgDefaultProps } from "types/common";

/**
 * Single placeholder for events without an image (or whose image failed):
 * the brand mark, small and soft, on the muted surface (`.card-placeholder`
 * in styles/globals.css, DESIGN.md › Shapes).
 *
 * - The same on every card: one look that means "no photo", like a default avatar.
 * - Not a loading skeleton (that is a plain pulsing block) and not artwork that
 *   claims something about the event (the old tickets drawing read as "paid").
 */
const ImgDefaultCore: React.FC<ImgDefaultProps> = ({ title }) => {
  return (
    <div
      className="card-placeholder"
      role={title ? "img" : "presentation"}
      aria-label={title || undefined}
      aria-hidden={!title}
    />
  );
};

export default ImgDefaultCore;
