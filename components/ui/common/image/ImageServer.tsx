import NextImage from "next/image";
import ImgDefaultServer from "@components/ui/imgDefault/ImgDefaultServer";
import { env } from "@utils/helpers";
import { ImageComponentProps } from "types/common";
import {
  getOptimalImageQuality,
  getOptimalImageSizes,
} from "@utils/image-quality";
import { buildOptimizedImageUrl } from "@utils/image-cache";

// Server-side compatible Image component
function ImageServer({
  title = "",
  image,
  className = "w-full h-full flex justify-center items-center",
  priority = false,
  alt = title,
  location,
  region,
  date,
  quality,
  context = "card", // Add context prop for size optimization
  cacheKey,
}: ImageComponentProps & { context?: "card" | "hero" | "list" | "detail" }) {
  if (!image) {
    return (
      <div className={className}>
        <ImgDefaultServer
          title={title}
          location={location}
          region={region}
          date={date}
        />
      </div>
    );
  }

  const imageQuality = getOptimalImageQuality({
    isPriority: priority,
    isExternal: true,
    customQuality: quality,
  });

  const finalImageSrc = buildOptimizedImageUrl(image, cacheKey);
  const shouldBypassOptimizer = finalImageSrc.startsWith("/api/");

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
        fetchPriority={priority ? "high" : "auto"}
        sizes={getOptimalImageSizes(context)}
        // On SST/OpenNext, internal /api/* image sources can cause the optimizer Lambda
        // to attempt an S3 asset lookup and fail with AccessDenied. Bypass optimization.
        unoptimized={shouldBypassOptimizer || env === "dev"}
      />
    </div>
  );
}

export default ImageServer;
