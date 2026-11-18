import Description from "@components/ui/common/description";
import React from "react";
import TranslateDescription from "./TranslateDescription";
import { isNonDefaultLocale } from "@utils/i18n-routing";
import { shortTagHash } from "@lib/cache/tags";
import type { EventDescriptionProps } from "types/event";

const DESCRIPTION_BODY_ID = "event-description-body";

const EventDescription: React.FC<EventDescriptionProps> = ({
  slug,
  description,
  introText,
  locale,
  showTranslate,
}) => {
  return (
    <div
      // A new description remounts the body and the button, so a stored
      // original or a late translation never lands on the new text.
      key={shortTagHash(description)}
      className="max-w-none text-foreground min-w-0"
    >
      <Description
        description={description}
        introText={introText}
        descriptionHtmlId={DESCRIPTION_BODY_ID}
        headerActions={
          showTranslate && isNonDefaultLocale(locale) ? (
            <TranslateDescription
              slug={slug}
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
