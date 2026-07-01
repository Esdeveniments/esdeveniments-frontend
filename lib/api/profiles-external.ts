import { fetchWithHmac } from "./fetch-wrapper";
import { parseUserPublic } from "@lib/validation/user";
import type { UserPublicResponseDTO } from "types/api/user";
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

// The backend exposes a lean public user (GET /api/users/{username}); the
// profile UI expects the richer ProfileDetailResponseDTO. Fields the backend
// does not return yet degrade to null/false/0 and the header hides them —
// they light up automatically once the backend adds them.
export function mapUserToProfile(
  user: UserPublicResponseDTO
): ProfileDetailResponseDTO {
  return {
    id: user.id,
    slug: user.username,
    name: user.name,
    avatarUrl: user.pictureUrl ?? null,
    coverUrl: null,
    bio: null,
    website: null,
    verified: false,
    joinedDate: user.createdAt,
    totalEvents: 0,
  };
}

export async function fetchProfileBySlugExternal(
  slug: string
): Promise<ProfileDetailResponseDTO | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return MOCK_PROFILES[slug] ?? null;
  }
  try {
    const response = await fetchWithHmac(
      `${apiUrl}/users/${encodeURIComponent(slug)}`
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      console.error(`fetchProfileBySlugExternal: HTTP ${response.status}`);
      return null;
    }
    const user = parseUserPublic(await response.json());
    return user ? mapUserToProfile(user) : null;
  } catch (error) {
    console.error("fetchProfileBySlugExternal: failed", error);
    return null;
  }
}
