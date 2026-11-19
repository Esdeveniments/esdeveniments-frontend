export type UploadImageResponse = {
  url: string;
  publicId: string;
};

/** Why a picked poster couldn't be turned into a backend-ready JPEG or PNG. */
export type PosterImageFailure =
  | "empty"
  | "undecodable"
  | "heic_undecodable"
  | "encode_failed"
  | "too_large";

export type PosterImageResult =
  | { ok: true; file: File; detectedType: string | null }
  | { ok: false; reason: PosterImageFailure; detectedType: string | null };

export type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};
