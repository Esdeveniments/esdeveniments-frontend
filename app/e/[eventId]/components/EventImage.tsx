"use client";

import { EventImageProps } from "types/event";
import { FC, useState } from "react";
import Image from "next/image";
import ImageDefault from "components/ui/imgDefault";

const EventImage: FC<EventImageProps> = ({ image, title }) => {
  const [hasError, setHasError] = useState(false);

  // No image provided or image failed to load
  if (!image || hasError) {
    return (
      <div className="w-full">
        <div className="w-full border-t"></div>
        <ImageDefault title={title} />
      </div>
    );
  }

  // Show image with clickable link
  return (
    <a
      href={image}
      className="flex justify-center w-full"
      target="_blank"
      rel="image_src noreferrer"
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
          sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 25vw"
          onError={() => setHasError(true)}
        />
      </div>
    </a>
  );
};

export default EventImage;
