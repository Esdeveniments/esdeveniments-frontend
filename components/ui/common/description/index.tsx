import DOMPurify from "isomorphic-dompurify";
import DocumentIcon from "@heroicons/react/outline/DocumentIcon";
import CulturalMessage from "../culturalMessage";
import { JSX, useMemo } from "react";
import { DescriptionProps } from "types/props";
import { processDescription } from "utils/text-processing";

export default function Description({
  description,
  location,
  locationValue,
}: DescriptionProps): JSX.Element {
  // Process and sanitize the description to prevent XSS attacks
  const sanitizedHtml = useMemo(() => {
    const processedDescription = processDescription(description || "");
    return DOMPurify.sanitize(processedDescription);
  }, [description]);

  return (
    <section className="w-full flex justify-center items-start gap-2 px-4">
      <DocumentIcon className="w-5 h-5 mt-1" aria-hidden="true" />
      <div className="w-11/12 flex flex-col gap-4">
        <h2>Descripció</h2>
        <div className="w-full break-words overflow-hidden">
          <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
          <CulturalMessage
            location={location || ""}
            locationValue={locationValue || ""}
          />
        </div>
      </div>
    </section>
  );
}
