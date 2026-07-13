import type { ProfileSlugUser } from "types/api/user";
import { sanitize } from "@utils/sanitize-segment";

/**
 * Build a URL-safe profile slug for a user.
 * Prefers the server-slugified username, falls back to a slugified display
 * name, and finally to the user id. Never exposes email addresses.
 */
export function getProfileSlug(user: ProfileSlugUser | null | undefined): string {
  if (!user) return "";
  if (user.username) return user.username;

  // Some identity providers set `name` to the email address when no display
  // name is configured. Sanitizing that would still expose the email in the
  // URL, so fall back to the user id instead.
  const name = user.name?.trim();
  if (name && !name.includes("@") && name !== user.email) {
    return sanitize(name);
  }

  return user.id;
}
