import Image from "@components/ui/common/image";
import type { ThumbnailProps } from "types/props";

/**
 * A 56px square beside a list row: the event's image, or the label's initial.
 * A broken image falls back to the branded placeholder, as on cards.
 */
export default function Thumbnail({
  image,
  label,
  muted = false,
}: ThumbnailProps) {
  return (
    <div
      aria-hidden="true"
      className={`relative w-14 h-14 shrink-0 overflow-hidden rounded-card bg-muted flex-center${muted ? " opacity-60 grayscale" : ""}`}
    >
      {image ? (
        <Image
          image={image}
          title={label}
          alt=""
          className="w-full h-full"
          context="thumb"
        />
      ) : (
        <span className="heading-4 text-muted-foreground">
          {label.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
