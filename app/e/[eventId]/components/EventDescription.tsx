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
    <div className="max-w-none text-foreground min-w-0">
      <Description
        description={description}
        location={location}
        locationValue={locationValue}
        introText={introText}
        locationType={locationType}
      />
    </div>
  );
};

export default EventDescription;
