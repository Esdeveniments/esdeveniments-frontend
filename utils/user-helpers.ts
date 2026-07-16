import type { ProfileSlugUser } from "types/api/user";
import { sanitize } from "@utils/sanitize-segment";

/** Matches standard hyphenated UUID formats (v1–v5). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when the value is a raw UUID that should never appear in a URL. */
function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Build a URL-safe profile slug for a user.
 * Prefers the server-slugified username, falls back to a slugified display
 * name, and returns an empty string when no safe slug is available. Never
 * exposes email addresses or raw UUIDs.
 */
export function getProfileSlug(user: ProfileSlugUser | null | undefined): string {
  if (!user) return "";

  // Never expose email addresses or raw UUIDs in profile URLs. If the server
  // ever returns either as a username, treat it as unavailable.
  const username = user.username?.trim();
  if (username && !username.includes("@") && !isUuid(username)) {
    return username;
  }

  // Some identity providers set `name` to the email address when no display
  // name is configured. Sanitizing that would still expose the email in the
  // URL, so treat it as unavailable. Also reject UUIDs and the fallback slug
  // "n-a" produced by sanitize() when no slug-safe characters remain.
  const name = user.name?.trim();
  if (name && !name.includes("@") && name !== user.email && !isUuid(name)) {
    const slug = sanitize(name);
    if (slug && slug !== "n-a") return slug;
  }

  return "";
}
