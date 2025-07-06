"use client";

import { useState, memo, useRef, RefObject } from "react";
import NextImage from "next/image";
import dynamic from "next/dynamic";
import useOnScreen from "@components/hooks/useOnScreen";
import { env } from "@utils/helpers";
import { useNetworkSpeed } from "@components/hooks/useNetworkSpeed";
import { ImageComponentProps } from "types/common";
import { getOptimalImageQuality } from "@utils/image-quality";

const ImgDefault = dynamic(() => import("@components/ui/imgDefault"), {
  loading: () => (
    <div className="flex justify-center items-center w-full">
      <div className="w-full h-60 bg-darkCorp animate-fast-pulse"></div>
    </div>
  ),
});

function ImageComponent({
  title = "",
  image,
  className = "w-full h-full flex justify-center items-center",
  priority = false,
  alt = title,
  quality: customQuality,
}: ImageComponentProps) {
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
  const networkQuality = useNetworkSpeed();

  const imageQuality = getOptimalImageQuality({
    isPriority: priority,
    isExternal: true,
    networkQuality,
    customQuality,
  });

  if (!image || hasError) {
    return (
      <div className={imageClassName} ref={divRef}>
        {isImgDefaultVisible ? (
          <ImgDefault title={title} />
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
        src={image}
        alt={alt}
        width={500}
        height={260}
        loading={priority ? "eager" : "lazy"}
        onError={() => setHasError(true)}
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

export default memo(ImageComponent);
