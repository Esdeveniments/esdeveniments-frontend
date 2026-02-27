import { fetchWithHmac } from "./fetch-wrapper";
import { parseProfileDetail } from "@lib/validation/profile";
import type { ProfileDetailResponseDTO } from "types/api/profile";

// Mock data returned when backend is not yet ready (env guard fallback)
const MOCK_PROFILES: Record<string, ProfileDetailResponseDTO> = {
  razzmatazz: {
    id: "mock-razzmatazz",
    slug: "razzmatazz",
    name: "Razzmatazz",
    avatarUrl: null,
    coverUrl: null,
    bio: "One of Barcelona's most iconic live music venues since 2000. Five rooms, countless genres.",
    website: "https://www.salarazzmatazz.com",
    verified: true,
    joinedDate: "2024-01-15",
    totalEvents: 142,
    city: "Barcelona",
    region: "Barcelonès",
    socialLinks: {
      instagram: "https://instagram.com/razzmatazz",
      twitter: "https://twitter.com/razzmatazz",
    },
  },
};

export async function fetchProfileBySlugExternal(
  slug: string
): Promise<ProfileDetailResponseDTO | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return MOCK_PROFILES[slug] ?? null;
  }
  try {
    const response = await fetchWithHmac(`${apiUrl}/profiles/${slug}`);
    if (response.status === 404) return null;
    if (response.status === 404) return null;
    if (!response.ok) {
      console.error(`fetchProfileBySlugExternal: HTTP ${response.status}`);
      // Fall back to mock while backend profiles endpoint is not yet implemented.
      // Once backend has /profiles/{slug}, change this to: return null;
      return MOCK_PROFILES[slug] ?? null;
    }
    const json = await response.json();
    return parseProfileDetail(json);
  } catch (error) {
    console.error("fetchProfileBySlugExternal: failed", error);
    return MOCK_PROFILES[slug] ?? null;
  }
}
