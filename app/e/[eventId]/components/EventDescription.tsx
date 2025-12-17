import Description from "@components/ui/common/description";
import React from "react";
import TranslateDescription from "./TranslateDescription";
import type { EventDescriptionProps } from "types/event";

const DESCRIPTION_BODY_ID = "event-description-body";

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
        descriptionHtmlId={DESCRIPTION_BODY_ID}
        headerActions={
          <TranslateDescription
            description={description}
            locale={locale}
            targetId={DESCRIPTION_BODY_ID}
          />
        }
      />
    </div>
  );
};

export default EventDescription;
