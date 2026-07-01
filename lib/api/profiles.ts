import { cache } from "react";
import {
  getUserByUsernameExternal,
  getUserEventsExternal,
} from "./users-external";
import type { ProfileDetailResponseDTO } from "types/api/profile";

async function fetchProfileByUsernameInternal(
  username: string
): Promise<ProfileDetailResponseDTO | null> {
  return getUserByUsernameExternal(username);
}

export const fetchProfileBySlug = cache(fetchProfileByUsernameInternal);
export const fetchUserByUsername = cache(fetchProfileByUsernameInternal);

// Request-level dedupe facade so components fetch a user's events through
// lib/api rather than importing the *-external helper directly.
export const fetchUserEvents = cache(getUserEventsExternal);
