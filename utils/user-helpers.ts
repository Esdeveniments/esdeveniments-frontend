import { sanitize } from "@utils/sanitize-segment";

interface ProfileSlugUser {
  id: string;
  name: string;
  username: string;
}

/**
 * Build a URL-safe profile slug for a user.
 * Prefers the server-slugified username, falls back to a slugified display
 * name, and finally to the user id. Never exposes email addresses.
 */
export function getProfileSlug(user: ProfileSlugUser | null | undefined): string {
  if (!user) return "";
  return user.username || (user.name ? sanitize(user.name) : user.id);
}
