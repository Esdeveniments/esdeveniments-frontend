import { JSX } from "react";
import { VideoDisplayProps } from "types/props";

const VideoDisplay = ({ videoUrl }: VideoDisplayProps): JSX.Element | null => {
  if (!videoUrl || videoUrl === "") {
    return null;
  }

  return (
    <div className="relative w-full overflow-hidden pt-[56.25%]">
      <iframe
        src={videoUrl}
        className="absolute left-0 top-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Embedded Video"
        loading="lazy"
      ></iframe>
    </div>
  );
};

export default VideoDisplay;
