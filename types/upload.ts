export type UploadImageResponse = {
  url: string;
  publicId: string;
};

/** Why a picked image couldn't be turned into a backend-ready JPEG or PNG. */
export type ImageUploadFailure =
  | "empty"
  | "original_too_large"
  | "undecodable"
  | "heic_undecodable"
  | "encode_failed"
  | "too_large";

export type ImageUploadResult =
  | { ok: true; file: File; detectedType: string | null }
  | { ok: false; reason: ImageUploadFailure; detectedType: string | null };

export type ImageUploadOptions = {
  /** Size the backend accepts. */
  maxBytes: number;
  /** Longest side after resizing. */
  maxDimension?: number;
  /** Smallest longest side worth sending; below it the image is too_large. */
  minDimension?: number;
};

export type ImageUploadMessageKey =
  | "originalTooLarge"
  | "tooLarge"
  | "heicUnsupported"
  | "compressFailed"
  | "unreadable";

/** The Components.ImageUploader translator, narrowed to the failure keys. */
export type ImageUploadTranslate = (
  key: ImageUploadMessageKey,
  values?: { limit: string },
) => string;

export type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};
