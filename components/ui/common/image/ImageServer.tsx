import NextImage from "next/image";
import ImgDefaultServer from "@components/ui/imgDefault/ImgDefaultServer";
import { env } from "@utils/helpers";
import { ImageComponentProps } from "types/common";
import {
  getOptimalImageQuality,
  getOptimalImageSizes,
} from "@utils/image-quality";
import { withImageCacheKey } from "@utils/image-cache";

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

  const finalImageSrc = cacheKey ? withImageCacheKey(image, cacheKey) : image;

  return (
    <div className={className} style={{ position: "relative" }}>
      <NextImage
        className="object-cover"
        src={finalImageSrc}
        alt={alt}
        width={500}
        height={260}
        loading={priority ? "eager" : "lazy"}
        quality={imageQuality}
        style={{
          objectFit: "cover",
          height: "auto", // Maintain aspect ratio
        }}
        priority={priority}
        fetchPriority={priority ? "high" : "auto"}
        sizes={getOptimalImageSizes(context)}
        unoptimized={env === "dev"}
      />
    </div>
  );
}

export default ImageServer;
