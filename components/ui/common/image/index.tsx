import type { ImageComponentProps } from "types/common";
import ImageServer from "./ImageServer";
import ClientImage from "./ClientImage";

/**
 * Server wrapper deciding the lightest rendering path:
 * - No image: pure server fallback (no hydration) via ImageServer & ImgDefaultServer.
 * - Image present: opt into enhanced client features (retry, network-adaptive quality).
 */
export default function Image(
  props: ImageComponentProps & { context?: "card" | "hero" | "list" | "detail" }
) {
  if (!props.image) {
    return <ImageServer {...props} />;
  }
  return <ClientImage {...props} />;
}
