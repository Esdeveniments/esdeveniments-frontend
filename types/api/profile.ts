import type { SocialLinks } from "../common";

export interface ProfileSummaryResponseDTO {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  website: string | null;
  verified: boolean;
  joinedDate: string;
  totalEvents: number;
  city?: string;
  region?: string;
}

export interface ProfileDetailResponseDTO extends ProfileSummaryResponseDTO {
  socialLinks?: Partial<SocialLinks>;
}
