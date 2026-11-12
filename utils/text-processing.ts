/**
 * Text processing utilities for handling user-generated content
 */

import { stripHtmlTags } from "./sanitize";
import {
  EVENT_DESCRIPTION_FOLD_CHARS,
  EVENT_DESCRIPTION_LINE_CHARS,
} from "./constants";

const LINE_BREAK = /\n|<br\s*\/?>|<\/(p|li|h[1-6]|div)>/gi;

// `[text](url)` (the URL may hold one level of parentheses, as on Wikipedia),
// or a bare URL. URL characters match the old autolinker.
const MARKDOWN_LINK_OR_URL =
  /\[([^\]\n]+)\]\(((?:https?:\/\/|www\.)(?:[^\s<>"{}|\\^`[\]()]|\([^\s<>"{}|\\^`[\]()]*\))+)\)|((?:https?:\/\/|www\.)[^\s<>"{}|\\^`[\]]+)/g;
const URL_TRAILING_PUNCTUATION = /[.,;:!?'"]$/;

const count = (text: string, char: string) => text.split(char).length - 1;

/** Drops sentence punctuation and an unbalanced `)` from the end of a bare URL. */
function trimUrlEnd(url: string): string {
  let trimmed = url;
  for (;;) {
    if (URL_TRAILING_PUNCTUATION.test(trimmed)) {
      trimmed = trimmed.slice(0, -1);
    } else if (trimmed.endsWith(")") && count(trimmed, ")") > count(trimmed, "(")) {
      trimmed = trimmed.slice(0, -1);
    } else {
      return trimmed;
    }
  }
}

function anchor(url: string, text: string): string {
  const href = /^https?:\/\//i.test(url) ? url : `http://${url}`;
  return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
}

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
  // (`<strong>` is allowlisted in utils/sanitize.ts). Spaces inside the
  // asterisks (`**Casa de Cultura. **`) are common in pasted text, so they
  // are allowed and dropped.
  let processed = description.replace(
    /\*\*[ \t]*([^*\n]*?\S)[ \t]*\*\*/g,
    "<strong>$1</strong>",
  );

  // One pass for markdown links (`[text](url)`, common in imported text) and
  // bare URLs, so a URL inside a markdown link is never linked twice.
  processed = processed.replace(
    MARKDOWN_LINK_OR_URL,
    (match, text: string | undefined, linkUrl: string | undefined, bareUrl: string | undefined) => {
      if (text && linkUrl) return anchor(linkUrl, text);
      const url = trimUrlEnd(bareUrl ?? match);
      if (!/^(?:https?:\/\/|www\.)[^.]/i.test(url)) return match;
      return anchor(url, url) + match.slice(url.length);
    },
  );

  // Convert line breaks to HTML breaks for better readability
  processed = processed.replace(/\n/g, "<br>");

  return processed;
}
