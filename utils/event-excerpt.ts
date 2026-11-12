import { stripHtmlTags } from "./sanitize";
import { normalizeForSearch, truncateAtWord } from "./string-helpers";
import { NEWS_EVENT_EXCERPT_MAX_LENGTH } from "./constants";

// A leading block longer than this is body text, even if it names the event.
const TITLE_ECHO_MAX_LENGTH = 160;

const tokenize = (text: string): string[] =>
  normalizeForSearch(text)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length >= 3);

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\((?:[^()\s]|\([^()\s]*\))*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\*+|__/g, "");
}

/** True when `segment` is a short heading that repeats the event title. */
function isTitleEcho(segment: string, title: string): boolean {
  const trimmed = segment.trim();
  // A heading has no sentence ending; a lead sentence that names the event is body text.
  if (trimmed.length > TITLE_ECHO_MAX_LENGTH || /[.!?…]$/u.test(trimmed)) {
    return false;
  }
  const titleTokens = tokenize(title);
  const segmentTokens = tokenize(segment);
  if (titleTokens.length === 0 || segmentTokens.length === 0) return false;
  const segmentText = ` ${segmentTokens.join(" ")} `;
  const titleText = ` ${titleTokens.join(" ")} `;
  // A one-word title must open the segment; longer titles may sit anywhere.
  if (
    titleTokens.length > 1
      ? segmentText.includes(titleText)
      : segmentText.startsWith(titleText)
  ) {
    return true;
  }
  const titleSet = new Set(titleTokens);
  const shared = segmentTokens.filter((token) => titleSet.has(token)).length;
  return segmentTokens.length >= 2 && shared / segmentTokens.length >= 0.8;
}

// Many descriptions open with "**Title** – Venue (date)": drop that first
// paragraph or line (longest first) when it only repeats the title.
function dropTitleEcho(text: string, title: string): string {
  const ends = [text.search(/\n\s*\n/), text.indexOf("\n")];
  const candidates = [...new Set(ends)]
    .filter((end) => end > 0 && end < text.length)
    .sort((a, b) => b - a);

  for (const end of candidates) {
    if (isTitleEcho(text.slice(0, end), title)) return text.slice(end);
  }
  return text;
}

/**
 * An event description (HTML, markdown or plain text) as plain text: line
 * breaks kept, tags and markdown syntax dropped, link text kept.
 */
export function descriptionToPlainText(description: string): string {
  const withBreaks = description.replace(
    /<br\s*\/?>|<\/(?:p|div|li|h[1-6])>/gi,
    "\n",
  );
  return stripMarkdown(stripHtmlTags(withBreaks)).trim();
}

/**
 * Plain-text excerpt of an event description for list rows: no HTML or
 * markdown, no leading heading line that repeats the title, cut at a word
 * boundary.
 */
export function buildEventExcerpt(
  description: string | null | undefined,
  title: string,
  maxLength: number = NEWS_EVENT_EXCERPT_MAX_LENGTH,
): string {
  if (!description) return "";
  const text = descriptionToPlainText(description);
  const body = dropTitleEcho(text, title).replace(/\s+/g, " ").trim();
  return truncateAtWord(body, maxLength);
}
