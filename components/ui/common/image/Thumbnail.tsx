import ImageServer from "@components/ui/common/image/ImageServer";
import type { ThumbnailProps } from "types/props";

/** A 56px square beside a list row: the event's image, or the label's initial. */
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
        <ImageServer
          image={image}
          title={label}
          alt=""
          className="w-14 h-14"
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
