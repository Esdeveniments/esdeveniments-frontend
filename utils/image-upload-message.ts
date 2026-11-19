import {
  MAX_ORIGINAL_LIMIT_LABEL,
  formatMegabytesLabel,
} from "@utils/constants";
import type { ImageUploadFailure, ImageUploadTranslate } from "types/upload";

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
