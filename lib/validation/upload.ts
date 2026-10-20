import { z } from "zod";
import type { UploadImageResponse } from "types/upload";

export const UploadImageResponseSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
}) satisfies z.ZodType<UploadImageResponse>;
