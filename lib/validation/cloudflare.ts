import { z } from "zod";

// Cloudflare v4 API envelope. Only the fields we read are validated.
const CloudflareApiResponseSchema = z.object({
  success: z.boolean(),
  errors: z
    .array(z.object({ code: z.number(), message: z.string() }))
    .default([]),
});

/**
 * Parse a `purge_cache` response. Returns the API error messages, `[]` on
 * success, or `null` when the body isn't the documented envelope.
 */
export function parseCloudflarePurgeResponse(input: unknown): string[] | null {
  const result = CloudflareApiResponseSchema.safeParse(input);
  if (!result.success) return null;
  if (result.data.success) return [];
  const messages = result.data.errors.map((e) => `${e.code}: ${e.message}`);
  return messages.length > 0 ? messages : ["unknown error"];
}
