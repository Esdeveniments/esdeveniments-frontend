"use client";

import { EventImageProps } from "types/event";
import { FC, useState } from "react";
import Image from "next/image";
import ImageDefault from "components/ui/imgDefault";
import { QUALITY_PRESETS } from "utils/image-quality";

const EventImage: FC<EventImageProps> = ({ image, title }) => {
  const [hasError, setHasError] = useState(false);

  if (!image || hasError) {
    return (
      <div className="w-full">
        <div className="w-full border-t"></div>
        <ImageDefault title={title} />
      </div>
    );
  }

  return (
    <a
      href={image}
      className="flex justify-center w-full"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="w-full" style={{ position: "relative", height: "260px" }}>
        <Image
          src={image}
          alt={title}
          title={title}
          fill
          className="object-cover"
          style={{ objectFit: "cover" }}
          priority={true}
          fetchPriority="high"
          quality={QUALITY_PRESETS.LCP_EXTERNAL}
          sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 25vw"
          onError={() => setHasError(true)}
        />
      </div>
    </a>
  );
};

export default EventImage;
