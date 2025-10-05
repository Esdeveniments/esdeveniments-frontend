import Description from "@components/ui/primitives/description";
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
    <div className="flex w-full items-start justify-center gap-component-xs px-component-md">
      <div className="max-w-none text-blackCorp">
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
