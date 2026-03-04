import { sanitizeHtml } from "@utils/sanitize";
import { DocumentIcon } from "@heroicons/react/24/outline";
import SectionHeading from "@components/ui/common/SectionHeading";
import { JSX } from "react";
import { getTranslations } from "next-intl/server";
import { DescriptionProps } from "types/props";
import { processDescription } from "utils/text-processing";

export default async function Description({
  description,
  introText,
  headerActions,
  descriptionHtmlId = "event-description-body",
}: DescriptionProps): Promise<JSX.Element> {
  const t = await getTranslations("Components.Description");
  // Process and sanitize the description to prevent XSS attacks
  const processedDescription = processDescription(description || "");
  const sanitizedHtml = sanitizeHtml(processedDescription);

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
        <div className="w-full max-w-prose break-words overflow-hidden space-y-4 px-4">
          {introText && (
            <p className="body-normal leading-[1.75] text-foreground-strong/90">{introText}</p>
          )}
          <div
            id={descriptionHtmlId}
            className="body-normal leading-[1.75] text-foreground-strong/90 [&>*]:body-normal [&>*]:leading-[1.75] [&>*]:text-foreground-strong/90"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        </div>
      </div>
    </section>
  );
}
