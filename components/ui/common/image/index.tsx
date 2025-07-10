"use client";

import { memo, useRef, RefObject } from "react";
import NextImage from "next/image";
import dynamic from "next/dynamic";
import useOnScreen from "@components/hooks/useOnScreen";
import { env } from "@utils/helpers";
import { useNetworkSpeed } from "@components/hooks/useNetworkSpeed";
import { useImagePerformance } from "@components/hooks/useImagePerformance";
import { useImageRetry } from "@components/hooks/useImageRetry";
import { ImageComponentProps } from "types/common";
import {
  getOptimalImageQuality,
  getOptimalImageSizes,
  getServerImageQuality,
} from "@utils/image-quality";

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
  context = "card", // Add context prop for size optimization
}: ImageComponentProps & { context?: "card" | "hero" | "list" | "detail" }) {
  const imgDefaultRef = useRef<HTMLDivElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const isImgDefaultVisible = useOnScreen<HTMLDivElement>(
    imgDefaultRef as RefObject<HTMLDivElement>,
    {
      freezeOnceVisible: true,
    }
  );

  const imageClassName = `${className}`;
  const networkQualityString = useNetworkSpeed();

  // Use the extracted retry hook
  const { hasError, isLoading, handleError, handleLoad, getImageKey } =
    useImageRetry(2);

  // useEffect(() => {
  //   reset();
  // }, [image]);

  const imageQuality = getOptimalImageQuality({
    isPriority: priority,
    isExternal: true,
    networkQuality: getServerImageQuality(networkQualityString),
    customQuality,
  });

  // Monitor image performance
  useImagePerformance(image, imageQuality, priority);

  // Get image key for retry logic
  const imageKey = getImageKey(image || "");

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
      {isLoading && (
        <div className="absolute inset-0 flex justify-center items-center bg-darkCorp animate-fast-pulse">
          <div className="w-full h-60 bg-darkCorp animate-fast-pulse"></div>
        </div>
      )}
      <NextImage
        key={imageKey}
        className="object-cover"
        src={image}
        alt={alt}
        width={500}
        height={260}
        loading={priority ? "eager" : "lazy"}
        onError={handleError}
        onLoad={handleLoad}
        quality={imageQuality}
        style={{
          objectFit: "cover",
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.3s ease-in-out",
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

export default memo(ImageComponent);
