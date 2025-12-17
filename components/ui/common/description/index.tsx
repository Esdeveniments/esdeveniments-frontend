import DOMPurify from "isomorphic-dompurify";
import DocumentIcon from "@heroicons/react/outline/DocumentIcon";
import CulturalMessage from "../culturalMessage";
import SectionHeading from "@components/ui/common/SectionHeading";
import { JSX } from "react";
import { getTranslations } from "next-intl/server";
import { DescriptionProps } from "types/props";
import { processDescription } from "utils/text-processing";

export default async function Description({
  description,
  location,
  locationValue,
  introText,
  locationType = "general",
  headerActions,
  descriptionHtmlId = "event-description-body",
}: DescriptionProps): Promise<JSX.Element> {
  const t = await getTranslations("Components.Description");
  // Process and sanitize the description to prevent XSS attacks
  const processedDescription = processDescription(description || "");
  const sanitizedHtml = DOMPurify.sanitize(processedDescription);

  return (
    <section className="w-full" aria-labelledby="description-section">
      <div className="stack min-w-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <SectionHeading
            headingId="description-section"
            Icon={DocumentIcon}
            iconClassName="w-5 h-5 text-foreground-strong flex-shrink-0"
            title={t("title")}
            titleClassName="heading-2"
          />
          {headerActions ? <div className="flex items-center">{headerActions}</div> : null}
        </div>
        <div className="w-full break-words overflow-hidden space-y-4 px-4">
          {introText && (
            <p className="body-normal text-foreground-strong">{introText}</p>
          )}
          <div
            id={descriptionHtmlId}
            className="body-normal text-foreground-strong [&>*]:body-normal [&>*]:text-foreground-strong"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
          <div className="body-normal text-foreground-strong">
            <CulturalMessage
              location={location || ""}
              locationValue={locationValue || ""}
              locationType={locationType}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
