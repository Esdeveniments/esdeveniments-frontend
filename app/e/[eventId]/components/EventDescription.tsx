import Description from "@components/ui/common/description";
import React from "react";
import TranslateDescription from "./TranslateDescription";
import type { EventDescriptionProps } from "types/event";

const DESCRIPTION_BODY_ID = "event-description-body";

const EventDescription: React.FC<EventDescriptionProps> = ({
  description,
  introText,
  locale,
  showTranslate,
}) => {
  return (
    <div className="max-w-none text-foreground min-w-0">
      <Description
        description={description}
        introText={introText}
        descriptionHtmlId={DESCRIPTION_BODY_ID}
        headerActions={
          showTranslate ? (
            <TranslateDescription
              description={description}
              locale={locale}
              targetId={DESCRIPTION_BODY_ID}
            />
          ) : undefined
        }
      />
    </div>
  );
};

export default EventDescription;
