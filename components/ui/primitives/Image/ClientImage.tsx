"use client";

import { forwardRef, useRef, RefObject } from "react";
import NextImage from "next/image";
import useOnScreen from "@components/hooks/useOnScreen";
import { env } from "@utils/helpers";
import { useNetworkSpeed } from "@components/hooks/useNetworkSpeed";
import { useImageRetry } from "@components/hooks/useImageRetry";
import { ImageProps } from "types/ui";
import {
  getOptimalImageQuality,
  getOptimalImageSizes,
  getServerImageQuality,
} from "@utils/image-quality";
import { cn } from "@components/utils/cn";
import { Text } from "@components/ui/primitives";

// Gradients for fallback
const gradients = [
  {
    gradient: "linear-gradient(120deg, #ff0037, #ff440d, #FF921A)",
    color: "#ff440d",
  },
  {
    gradient: "linear-gradient(120deg, #FF0033, #FF8340, #F8FFC6)",
    color: "#FF8340",
  },
  {
    gradient: "linear-gradient(120deg, #FF0033, #FF1D00, #FFA785)",
    color: "#FF1D00",
  },
  {
    gradient: "linear-gradient(120deg, #F06E0C, #EBAB07, #EFE900)",
    color: "#EBAB07",
  },
  {
    gradient: "linear-gradient(120deg, #03001e, #7303c0, #ec38bc)",
    color: "#7303c0",
  },
  { gradient: "linear-gradient(120deg, #0575e6, #00f260)", color: "#0575e6" },
  {
    gradient: "linear-gradient(120deg, #2948ff, #396afc, #4B88FA)",
    color: "#396afc",
  },
];

// Simple hash function for gradient selection
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Image component with automatic fallback to gradient placeholder.
 *
 * @example
 * ```tsx
 * <Image title="Event Title" image="/path/to/image.jpg" alt="Event image" />
 * <Image title="Event Title" location="Barcelona" region="Catalonia" />
 * ```
 */
export const ClientImage = forwardRef<HTMLDivElement, ImageProps>(
  (
    {
      title,
      image,
      className = "w-full h-full flex justify-center items-center",
      alt = title,
      priority = false,
      quality,
      location,
      region,
      date,
      context = "card",
      ...rest
    },
    ref,
  ) => {
    const imgDefaultRef = useRef<HTMLDivElement>(null);
    const isImgDefaultVisible = useOnScreen<HTMLDivElement>(
      imgDefaultRef as RefObject<HTMLDivElement>,
      { freezeOnceVisible: true },
    );

    const imageClassName = cn(className);
    const networkQualityString = useNetworkSpeed();

    const { hasError, isLoading, handleError, handleLoad, getImageKey } =
      useImageRetry(2);

    const imageQuality = getOptimalImageQuality({
      isPriority: priority,
      isExternal: true,
      networkQuality: getServerImageQuality(networkQualityString),
      customQuality: quality,
    });

    const imageKey = getImageKey(image || "");

    // Fallback component
    const Fallback = () => {
      const gradientIndex = hashString(title) % gradients.length;
      const background = gradients[gradientIndex];

      return (
        <div
          className="flex h-full w-full flex-col items-start justify-between p-component-md"
          style={{
            backgroundImage: background.gradient,
            backgroundSize: "cover",
            backgroundPosition: "center",
            minHeight: "260px",
          }}
        >
          {/* Top section - Event Info */}
          <div className="flex w-full items-start justify-start gap-component-xs">
            <div className="flex w-full min-w-0 flex-col items-start justify-start gap-component-xs">
              {/* Location Icon and City */}
              {location && (
                <div className="flex items-center gap-component-xs">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-whiteCorp/20">
                    <div className="h-2 w-2 rounded-full bg-whiteCorp"></div>
                  </div>
                  <Text
                    as="h2"
                    variant="h2"
                    className="font-bold uppercase drop-shadow-md"
                  >
                    {location}
                  </Text>
                </div>
              )}

              {/* Region */}
              {region && (
                <Text
                  variant="body-sm"
                  className="ml-component-lg drop-shadow-md"
                >
                  {region}
                </Text>
              )}

              <div className="my-component-xs h-px w-full bg-whiteCorp/30"></div>

              {/* Event Title */}
              <Text
                variant="h1"
                className="break-words font-roboto font-bold uppercase leading-tight tracking-wide drop-shadow-md"
              >
                {title}
              </Text>

              {/* Date */}
              {date && (
                <Text variant="body-sm" className="drop-shadow-md">
                  {date}
                </Text>
              )}
            </div>
          </div>

          {/* Bottom section - Tickets */}
          <div className="flex w-full items-end justify-end">
            <div className="h-12 w-20">
              <NextImage
                className="h-full w-full drop-shadow-md"
                src="/static/images/tickets-color.svg"
                alt="Tickets"
                width={80}
                height={48}
              />
            </div>
          </div>
        </div>
      );
    };

    // Error fallback: keep semantics for accessibility
    if (hasError || !image) {
      return (
        <div
          ref={ref}
          className={imageClassName}
          role="img"
          aria-label={title || "Imatge no disponible"}
          {...rest}
        >
          {isImgDefaultVisible ? (
            <Fallback />
          ) : (
            <div className="flex w-full items-center justify-center">
              <div
                className="h-60 w-full animate-fast-pulse bg-darkCorp"
                ref={imgDefaultRef}
              ></div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={imageClassName}
        style={{ position: "relative" }}
        {...rest}
      >
        {isLoading && (
          <div className="absolute inset-0 flex animate-fast-pulse items-center justify-center bg-darkCorp">
            <div className="h-60 w-full animate-fast-pulse bg-darkCorp"></div>
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
            height: "auto",
          }}
          priority={priority}
          fetchPriority={priority ? "high" : "low"}
          sizes={getOptimalImageSizes(context)}
          unoptimized={env === "dev"}
        />
      </div>
    );
  },
);

ClientImage.displayName = "ClientImage";
