import NextImage from "next/image";
import ImgDefaultServer from "@components/ui/imgDefault/ImgDefaultServer";
import { env } from "@utils/helpers";
import { ImageComponentProps } from "types/common";
import {
  getOptimalImageQuality,
  getOptimalImageSizes,
  getOptimalImageWidth,
} from "@utils/image-quality";
import { buildOptimizedImageUrl } from "@utils/image-cache";

// Server-side compatible Image component
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
  context = "card", // Add context prop for size optimization
  cacheKey,
}: ImageComponentProps & { context?: "card" | "hero" | "list" | "detail" }) {
  const imageQuality = getOptimalImageQuality({
    isPriority: priority,
    isExternal: true,
    customQuality: quality,
  });

  const imageWidth = getOptimalImageWidth(context);

  // buildOptimizedImageUrl handles null/empty input and returns "" for invalid URLs (e.g., overly long)
  // Pass width and quality to the proxy for server-side optimization
  const finalImageSrc = buildOptimizedImageUrl(image ?? "", cacheKey, {
    width: imageWidth,
    quality: imageQuality,
  });

  // Show fallback if no image or URL normalization failed
  if (!finalImageSrc) {
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

  const shouldBypassOptimizer = finalImageSrc.startsWith("/api/");

  // Since we're already doing server-side optimization in the proxy,
  // we can skip the Next.js optimizer to avoid double-processing
  return (
    <div
      className={className}
      style={{
        position: "relative",
        aspectRatio: "500 / 260", // Prevent CLS by reserving space
        maxWidth: "100%", // Ensure image doesn't exceed container
      }}
    >
      <NextImage
        className="object-cover w-full h-full"
        src={finalImageSrc}
        alt={alt}
        width={500}
        height={260}
        loading={priority ? "eager" : "lazy"}
        quality={imageQuality}
        style={{
          objectFit: "cover",
          width: "100%",
          height: "auto", // Maintain aspect ratio
          maxWidth: "100%", // Ensure image respects container constraints
        }}
        priority={priority}
        fetchPriority={fetchPriority ?? (priority ? "high" : "auto")}
        sizes={getOptimalImageSizes(context)}
        // On SST/OpenNext, internal /api/* image sources can cause the optimizer Lambda
        // to attempt an S3 asset lookup and fail with AccessDenied. Bypass optimization.
        // Note: Our image proxy now handles optimization (resize, format conversion, quality)
        // so we don't lose quality by bypassing Next.js optimizer.
        unoptimized={shouldBypassOptimizer || env === "dev"}
      />
    </div>
  );
}

export default ImageServer;
