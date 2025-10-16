import Description from "@components/ui/common/description";
import React from "react";
import type { EventDescriptionProps } from "types/event";

const EventDescription: React.FC<EventDescriptionProps> = ({
  description,
  location,
  locationValue,
  introText,
  locationType = "general",
}) => {
  return (
    <div className="w-full flex justify-center items-start gap-2 px-4">
      <div className="max-w-none text-foreground">
        <Description
          description={description}
          location={location}
          locationValue={locationValue}
          introText={introText}
          locationType={locationType}
        />
      </div>
    </div>
  );
};

export default EventDescription;
