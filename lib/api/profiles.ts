import { cache } from "react";
import { fetchWithHmac } from "./fetch-wrapper";
import { parseProfileDetail } from "@lib/validation/profile";
import { fetchProfileBySlugExternal } from "./profiles-external";
import { isBuildPhase } from "@utils/constants";
import type { ProfileDetailResponseDTO } from "types/api/profile";

async function fetchProfileBySlugInternal(
  slug: string
): Promise<ProfileDetailResponseDTO | null> {
  if (isBuildPhase) {
    return fetchProfileBySlugExternal(slug);
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return fetchProfileBySlugExternal(slug);
  }

  try {
    const response = await fetchWithHmac(`${apiUrl}/profiles/${slug}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      console.error(
        `fetchProfileBySlug: HTTP error! status: ${response.status}`
      );
      return fetchProfileBySlugExternal(slug);
    }
    return parseProfileDetail(await response.json());
  } catch (error) {
    console.error("fetchProfileBySlug: failed, falling back to external", error);
    return fetchProfileBySlugExternal(slug);
  }
}

export const fetchProfileBySlug = cache(fetchProfileBySlugInternal);
