/**
 * Text processing utilities for handling user-generated content
 */

/**
 * Processes text description by converting URLs to clickable links and line breaks to HTML breaks
 * @param description - The raw text description to process
 * @returns Processed HTML string with converted URLs and line breaks
 */
export function processDescription(description: string): string {
  if (!description || typeof description !== "string") return "";

  // Auto-convert plain text URLs to links
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+|www\.[^\s<>"{}|\\^`[\]]+)/g;
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
