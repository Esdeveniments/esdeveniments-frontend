import Description from "@components/ui/common/description";
import React from "react";
import TranslateDescription from "./TranslateDescription";
import type { EventDescriptionProps } from "types/event";

const EventDescription: React.FC<EventDescriptionProps> = ({
  description,
  location,
  locationValue,
  introText,
  locationType = "general",
  locale,
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
      <div className="px-4 pt-4">
        <TranslateDescription description={description} locale={locale} />
      </div>
    </div>
  );
};

export default EventDescription;
