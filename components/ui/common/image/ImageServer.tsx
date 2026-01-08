import ImgDefaultServer from "@components/ui/imgDefault/ImgDefaultServer";
import { ImageComponentProps } from "types/common";
import {
  getOptimalImageQuality,
  getOptimalImageSizes,
  getOptimalImageWidth,
} from "@utils/image-quality";
import { buildPictureSourceUrls } from "@utils/image-cache";

// Server-side compatible Image component with modern format support (WebP > AVIF > JPEG)
// WebP is prioritized over AVIF for faster encoding and more reliable output.
function ImageServer({
  title = "",
  image,
  className = "w-full h-full flex justify-center items-center",
  priority = false,
  fetchPriority,
  alt = title,
  location,
  region,
  date,
  quality,
  context = "card",
  cacheKey,
}: ImageComponentProps & { context?: "card" | "hero" | "list" | "detail" }) {
  const imageQuality = getOptimalImageQuality({
    isPriority: priority,
    isExternal: true,
    customQuality: quality,
  });

  const imageWidth = getOptimalImageWidth(context);

  // Generate AVIF, WebP, and JPEG URLs for <picture> element
  const sources = buildPictureSourceUrls(image ?? "", cacheKey, {
    width: imageWidth,
    quality: imageQuality,
  });

  // Show fallback if no image or URL normalization failed
  if (!sources.fallback) {
    return (
      <div
        className={className}
        style={{
          position: "relative",
          aspectRatio: "500 / 260",
          maxWidth: "100%",
        }}
      >
        <ImgDefaultServer
          title={title}
          location={location}
          region={region}
          date={date}
        />
      </div>
    );
  }

  const sizes = getOptimalImageSizes(context);

  // Use native <picture> element for proper format fallback:
  // - Browser tries WebP first (faster encoding, more reliable)
  // - Falls back to AVIF (better compression but slower/riskier encoding)
  // - Falls back to JPEG (100% support)
  // Our proxy handles all optimization, so we don't need Next.js Image optimizer
  return (
    <div
      className={className}
      style={{
        position: "relative",
        aspectRatio: "500 / 260",
        maxWidth: "100%",
      }}
    >
      <picture>
        <source srcSet={sources.webp} type="image/webp" sizes={sizes} />
        <source srcSet={sources.avif} type="image/avif" sizes={sizes} />
        <img
          className="object-cover w-full h-full absolute inset-0"
          src={sources.fallback}
          alt={alt}
          width={500}
          height={260}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          fetchPriority={fetchPriority ?? (priority ? "high" : "auto")}
          sizes={sizes}
        />
      </picture>
    </div>
  );
}

export default ImageServer;
