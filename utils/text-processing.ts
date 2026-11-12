/**
 * Text processing utilities for handling user-generated content
 */

import { stripHtmlTags } from "./sanitize";
import {
  EVENT_DESCRIPTION_FOLD_CHARS,
  EVENT_DESCRIPTION_LINE_CHARS,
} from "./constants";

const LINE_BREAK = /\n|<br\s*\/?>|<\/(p|li|h[1-6]|div)>/gi;

/** Whether a description (plain text or HTML) is taller than the mobile fold. */
export function isLongDescription(text: string): boolean {
  const lineBreaks = text.match(LINE_BREAK)?.length ?? 0;
  return (
    stripHtmlTags(text).length + lineBreaks * EVENT_DESCRIPTION_LINE_CHARS >
    EVENT_DESCRIPTION_FOLD_CHARS
  );
}

/**
 * Processes text description by converting URLs to clickable links and line breaks to HTML breaks
 * @param description - The raw text description to process
 * @returns Processed HTML string with converted URLs and line breaks
 */
export function processDescription(description: string): string {
  if (!description || typeof description !== "string") return "";

  // Markdown bold (`**text**`) from imported descriptions. Runs before the URL
  // step so a link never swallows the asterisks; callers sanitize the result
  // (`<strong>` is allowlisted in utils/sanitize.ts).
  let processed = description.replace(
    /\*\*(?=\S)([^*\n]*?\S)\*\*/g,
    "<strong>$1</strong>",
  );

  // Auto-convert plain text URLs to links
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+|www\.[^\s<>"{}|\\^`[\]]+)/g;
  processed = processed.replace(urlRegex, function (url) {
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
