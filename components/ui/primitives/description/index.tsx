import DOMPurify from "isomorphic-dompurify";
import DocumentIcon from "@heroicons/react/outline/DocumentIcon";
import CulturalMessage from "../culturalMessage";
import { JSX } from "react";
import { DescriptionProps } from "types/props";
import { processDescription } from "utils/text-processing";
import { Text } from "@components/ui/primitives/Text";

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
    <section className="flex w-full items-start justify-center gap-component-xs">
      <DocumentIcon className="mt-component-xs h-5 w-5" aria-hidden="true" />
      <div className="flex w-11/12 flex-col gap-component-md">
        <Text as="h2" variant="h2">
          Descripció
        </Text>
        <div className="w-full space-y-4 overflow-hidden break-words">
          {introText && (
            <Text
              as="p"
              size="base"
              color="black"
              className="font-normal leading-relaxed"
            >
              {introText}
            </Text>
          )}
          <Text
            as="div"
            variant="body"
            color="black"
            className="font-normal leading-relaxed [&>*]:font-normal [&>*]:leading-relaxed [&>*]:text-blackCorp"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
          <Text as="div" size="base" color="black" className="font-normal">
            <CulturalMessage
              location={location || ""}
              locationValue={locationValue || ""}
              locationType={locationType}
            />
          </Text>
        </div>
      </div>
    </section>
  );
}
