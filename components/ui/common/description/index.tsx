import DOMPurify from "isomorphic-dompurify";
import DocumentIcon from "@heroicons/react/outline/DocumentIcon";
import CulturalMessage from "../culturalMessage";
import { JSX } from "react";
import { DescriptionProps } from "types/props";
import { processDescription } from "utils/text-processing";

export default function Description({
  description,
  location,
  locationValue,
  introText,
  locationType = "general",
}: DescriptionProps): JSX.Element {
  // Process and sanitize the description to prevent XSS attacks
  const processedDescription = processDescription(description || "");
  const sanitizedHtml = DOMPurify.sanitize(processedDescription);

  return (
    <section className="w-full flex justify-center items-start gap-2">
      <DocumentIcon className="w-5 h-5 mt-1" aria-hidden="true" />
      <div className="stack w-11/12">
        <h2 className="heading-3">Descripció</h2>
        <div className="w-full break-words overflow-hidden space-y-4">
          {introText && (
            <p className="body-normal text-blackCorp">{introText}</p>
          )}
          <div
            className="body-normal text-blackCorp [&>*]:body-normal [&>*]:text-blackCorp"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
          <div className="body-normal text-blackCorp">
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
