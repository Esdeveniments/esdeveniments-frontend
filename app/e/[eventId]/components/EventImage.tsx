import { EventImageProps } from "types/event";
import dynamic from "next/dynamic";
import { FC } from "react";

const Image = dynamic(() => import("@components/ui/common/image"), {
  loading: () => (
    <div className="flex justify-center items-center w-full">
      <div className="w-full h-60 bg-darkCorp animate-fast-pulse"></div>
    </div>
  ),
});

const ImageDefault = dynamic(() => import("@components/ui/imgDefault"), {
  loading: () => null,
});

const EventImage: FC<EventImageProps> = ({
  image,
  title,
  location,
  nameDay,
  formattedStart,
}) => {
  if (image) {
    return (
      <a
        href={image}
        className="flex justify-center"
        target="_blank"
        rel="image_src noreferrer"
      >
        <Image
          alt={title}
          title={title}
          image={image}
          className="w-full object-center object-cover"
          priority={true}
        />
      </a>
    );
  }

  const date = `${nameDay} ${formattedStart}`;

  return (
    <div className="w-full">
      <div className="w-full border-t"></div>
      <ImageDefault date={date} location={location} subLocation={title} />
    </div>
  );
};

export default EventImage;
