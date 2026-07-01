import { cache } from "react";
import { fetchProfileBySlugExternal } from "./profiles-external";
import type { ProfileDetailResponseDTO } from "types/api/profile";

async function fetchProfileBySlugInternal(
  slug: string
): Promise<ProfileDetailResponseDTO | null> {
  return fetchProfileBySlugExternal(slug);
}

export const fetchProfileBySlug = cache(fetchProfileBySlugInternal);
