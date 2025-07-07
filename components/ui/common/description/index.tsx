import DOMPurify from "isomorphic-dompurify";
import DocumentIcon from "@heroicons/react/outline/DocumentIcon";
import CulturalMessage from "../culturalMessage";
import { JSX } from "react";
import { DescriptionProps } from "types/props";

// Smart content processing function
function processDescription(description: string): string {
  if (!description) return "";

  // Auto-convert plain text URLs to links (replicating your existing replaceURLs logic)
  const urlRegex = /(((https?:\/\/)|(www\.))[^\s]+)/g;
  let processed = description.replace(urlRegex, function (url) {
    let hyperlink = url;
    if (!hyperlink.match("^https?://")) {
      hyperlink = "http://" + hyperlink;
    }
    return `<a href="${hyperlink}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });

  // Convert line breaks to HTML breaks for better readability
  processed = processed.replace(/\n/g, "<br>");

  return processed;
}

export default function Description({
  description,
  location,
  locationValue,
}: DescriptionProps): JSX.Element {
  // Process and sanitize the description to prevent XSS attacks
  const processedDescription = processDescription(description || "");
  const sanitizedHtml = DOMPurify.sanitize(processedDescription);

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
