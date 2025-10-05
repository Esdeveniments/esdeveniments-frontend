import { EventImageProps } from "types/event";
import { FC } from "react";
import { Image } from "@components/ui/primitives";
import { default as ImageDefault } from "@components/ui/primitives/ImgDefault";

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
      className="flex w-full justify-center"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div style={{ position: "relative", height: "260px" }}>
        <Image
          title={title}
          alt={title}
          image={image}
          className="h-full w-full object-cover"
          priority={true}
          context="detail"
        />
      </div>
    </a>
  );
};

export default EventImage;
