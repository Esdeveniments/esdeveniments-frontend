import NextImage from "next/image";
import ImgDefaultServer from "@components/ui/imgDefault/ImgDefaultServer";
import { env } from "@utils/helpers";
import { ImageComponentProps } from "types/common";
import { getServerImageQuality } from "@utils/image-quality";

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
}: ImageComponentProps) {
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

  const imageQuality = getServerImageQuality({
    isPriority: priority,
    isExternal: true,
    customQuality: quality,
  });

  return (
    <div className={className} style={{ position: "relative" }}>
      <NextImage
        className="object-cover"
        src={image}
        alt={alt}
        width={500}
        height={260}
        loading={priority ? "eager" : "lazy"}
        quality={imageQuality}
        style={{
          objectFit: "cover",
        }}
        priority={priority}
        fetchPriority={priority ? "high" : "auto"}
        sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 25vw"
        unoptimized={env === "dev"}
      />
    </div>
  );
}

export default ImageServer;
