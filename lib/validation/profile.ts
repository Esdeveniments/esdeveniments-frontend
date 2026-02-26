import { z } from "zod";
import type {
  ProfileDetailResponseDTO,
  ProfileSummaryResponseDTO,
} from "types/api/profile";

export const ProfileSummaryResponseDTOSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable().optional().default(null),
  coverUrl: z.string().nullable().optional().default(null),
  bio: z.string().nullable().optional().default(null),
  website: z.string().nullable().optional().default(null),
  verified: z.boolean().optional().default(false),
  joinedDate: z.string().optional().default(""),
  totalEvents: z.number().optional().default(0),
  city: z.string().optional(),
  region: z.string().optional(),
});

export const ProfileDetailResponseDTOSchema =
  ProfileSummaryResponseDTOSchema.extend({
    socialLinks: z
      .record(z.string(), z.string().optional())
      .optional(),
  });

export function parseProfileDetail(
  input: unknown
): ProfileDetailResponseDTO | null {
  const result = ProfileDetailResponseDTOSchema.safeParse(input);
  if (!result.success) {
    console.error("parseProfileDetail: invalid profile payload", result.error);
    return null;
  }
  return result.data as ProfileDetailResponseDTO;
}

export function parseProfileSummary(
  input: unknown
): ProfileSummaryResponseDTO | null {
  const result = ProfileSummaryResponseDTOSchema.safeParse(input);
  if (!result.success) {
    console.error(
      "parseProfileSummary: invalid profile payload",
      result.error
    );
    return null;
  }
  return result.data as ProfileSummaryResponseDTO;
}
