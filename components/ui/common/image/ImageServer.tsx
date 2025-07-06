import NextImage from "next/image";
import ImgDefaultServer from "@components/ui/imgDefault/ImgDefaultServer";
import { env } from "@utils/helpers";
import { ImageComponentProps } from "types/common";

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
}: ImageComponentProps) {
  if (!image) {
    // Use server-side gradient fallback
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

  return (
    <div className={className} style={{ position: "relative" }}>
      <NextImage
        className="object-cover"
        src={image}
        alt={alt}
        width={500}
        height={260}
        loading={priority ? "eager" : "lazy"}
        quality={75} // Fixed quality for server-side
        style={{
          objectFit: "cover",
        }}
        priority={priority}
        sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 25vw"
        unoptimized={env === "dev"}
        // For server-side, we can't handle onError, so we rely on Next.js built-in fallbacks
      />
    </div>
  );
}

export default ImageServer;
