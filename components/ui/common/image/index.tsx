import { useState, memo, useRef, RefObject } from "react";
import NextImage from "next/image";
import dynamic from "next/dynamic";
import useOnScreen from "@components/hooks/useOnScreen";
import { env } from "@utils/helpers";
import { useNetworkSpeed } from "@components/hooks/useNetworkSpeed";
import { LoaderProps, ImageComponentProps } from "types/common";

const ImgDefault = dynamic(() => import("@components/ui/imgDefault"), {
  loading: () => (
    <div className="flex justify-center items-center w-full">
      <div className="w-full h-60 bg-darkCorp animate-fast-pulse"></div>
    </div>
  ),
});

const cloudflareLoader = ({ src, width, quality }: LoaderProps): string => {
  console.log(width, quality);
  return src;
  // if (!src) return "";
  // const normalizedSrc = src.startsWith("/") ? src.slice(1) : src;
  // const params = [`width=${width}`, `quality=${quality}`, "format=auto"];
  // const paramsString = params.join(",");

  // return env === "prod"
  //   ? `/cdn-cgi/image/${paramsString}/${normalizedSrc}`
  //   : src;
};

function ImageComponent({
  title = "",
  date = "",
  location = "",
  subLocation = "",
  image,
  className = "w-full h-full flex justify-center items-center",
  priority = false,
  alt = title,
}: ImageComponentProps) {
  // Use HTMLDivElement for consistency with the rest of the codebase
  const imgDefaultRef = useRef<HTMLDivElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const isImgDefaultVisible = useOnScreen<HTMLDivElement>(
    imgDefaultRef as RefObject<HTMLDivElement>,
    {
      freezeOnceVisible: true,
    }
  );
  const [hasError, setHasError] = useState(false);
  const imageClassName = `${className}`;
  const quality = useNetworkSpeed();

  if (!image || hasError) {
    return (
      <div className={imageClassName} ref={divRef}>
        {isImgDefaultVisible ? (
          <ImgDefault
            date={date}
            location={location}
            subLocation={subLocation}
          />
        ) : (
          <div className="flex justify-center items-center w-full">
            <div
              className="w-full h-60 bg-darkCorp animate-fast-pulse"
              ref={imgDefaultRef}
            ></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={imageClassName} style={{ position: "relative" }}>
      <NextImage
        className="object-cover"
        loader={({ src, width }: LoaderProps) =>
          cloudflareLoader({ src, width, quality })
        }
        src={image}
        alt={alt}
        width={500}
        height={260}
        loading={priority ? "eager" : "lazy"}
        onError={() => setHasError(true)}
        quality={quality}
        style={{
          objectFit: "cover",
        }}
        priority={priority}
        sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 25vw"
        unoptimized={env === "dev"}
      />
    </div>
  );
}

export default memo(ImageComponent);
