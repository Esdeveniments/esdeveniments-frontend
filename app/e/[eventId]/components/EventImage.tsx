"use client";

import { EventImageProps } from "types/event";
import { FC } from "react";
import Image from "@components/ui/common/image";
import ImageDefault from "components/ui/imgDefault";

const EventImage: FC<EventImageProps> = ({ image, title }) => {
  if (!image) {
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
          key={image} // Force remount when image changes
          title={title}
          alt={title}
          image={image}
          className="w-full h-full object-cover"
          priority={true}
          context="detail"
        />
      </div>
    </a>
  );
};

export default EventImage;
