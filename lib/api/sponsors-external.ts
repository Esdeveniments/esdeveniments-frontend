import "server-only";
import { fetchWithHmac } from "./fetch-wrapper";
import { getApiUrl, isApiUrlConfigured } from "@utils/api-helpers";
import { UploadImageResponseSchema } from "@lib/validation/upload";
import { isE2ETestMode } from "@utils/env";
import { EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR, MAX_SPONSOR_IMAGE_BYTES } from "@utils/constants";
import type { UploadImageResponse } from "types/upload";

export async function uploadSponsorImage(imageFile: File): Promise<UploadImageResponse> {
  if (imageFile.size > MAX_SPONSOR_IMAGE_BYTES) {
    throw new Error(EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR);
  }
  if (isE2ETestMode) {
    return { url: `https://example.com/${imageFile.name || "e2e-image"}.jpg`, publicId: "e2e-image" };
  }
  if (!isApiUrlConfigured()) {
    throw new Error("NEXT_PUBLIC_API_URL or API_URL is not set");
  }
  const body = new FormData();
  body.append("imageFile", imageFile);
  const response = await fetchWithHmac(`${getApiUrl()}/sponsors/images`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body,
    skipBodySigning: true,
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 200);
    if (response.status === 413) {
      console.error(`Sponsor image upload rejected: HTTP 413, body=${detail}`);
      throw new Error(EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR);
    }
    throw new Error(`Sponsor image upload failed: HTTP ${response.status}, ${detail}`);
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new Error("Sponsor image upload returned an invalid response", { cause });
  }
  const parsed = UploadImageResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Sponsor image upload returned an invalid response", { cause: parsed.error });
  }
  return parsed.data;
}
