import {
  MAX_ORIGINAL_LIMIT_LABEL,
  formatMegabytesLabel,
} from "@utils/constants";
import type {
  ImageUploadFailure,
  ImageUploadOptions,
  ImageUploadResult,
  ImageUploadTranslate,
} from "types/upload";

/**
 * prepareImageForUpload, loaded when a file is picked: the decode and encode
 * code (~4 KB gzipped) stays out of the page's JavaScript until it is needed.
 */
export async function loadAndPrepareImage(
  file: File,
  options: ImageUploadOptions,
): Promise<ImageUploadResult> {
  const { prepareImageForUpload } = await import("@utils/image-optimizer");
  return prepareImageForUpload(file, options);
}

/** Text for a failed prepareImageForUpload, from Components.ImageUploader. */
export function imageUploadErrorMessage(
  t: ImageUploadTranslate,
  reason: ImageUploadFailure,
  maxBytes: number,
): string {
  switch (reason) {
    case "original_too_large":
      return t("originalTooLarge", { limit: MAX_ORIGINAL_LIMIT_LABEL });
    case "too_large":
      return t("tooLarge", { limit: formatMegabytesLabel(maxBytes) });
    case "heic_undecodable":
      return t("heicUnsupported");
    case "encode_failed":
      return t("compressFailed");
    default:
      return t("unreadable");
  }
}
