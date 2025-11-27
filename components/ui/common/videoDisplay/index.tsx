import { JSX } from "react";
import { VideoDisplayProps } from "types/props";

const VideoDisplay = ({ videoUrl }: VideoDisplayProps): JSX.Element | null => {
  if (!videoUrl || videoUrl === "") {
    return null;
  }

  return (
    <div className="relative pt-[56.25%] overflow-hidden w-full">
      <iframe
        src={videoUrl}
        className="absolute top-0 left-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Embedded Video"
        loading="lazy"
      ></iframe>
    </div>
  );
};

export default VideoDisplay;
