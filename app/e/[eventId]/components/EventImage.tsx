import { EventImageProps } from "types/event";
import { FC } from "react";
import NextImage from "next/image";
import ImageDefault from "components/ui/imgDefault";
import { getOptimalImageQuality } from "@utils/image-quality";

const EventImage: FC<EventImageProps> = ({ image, title }) => {
  if (!image) {
    return (
      <div className="w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden rounded-card">
        <ImageDefault title={title} />
      </div>
    );
  }

  const imageQuality = getOptimalImageQuality({
    isPriority: true,
    isExternal: true,
  });

  return (
    <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden rounded-card bg-muted">
      <NextImage
        src={image}
        alt={title}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px"
        className="object-cover"
        priority={true}
        quality={imageQuality}
        loading="eager"
        fetchPriority="high"
      />
    </div>
  );
};

export default EventImage;
