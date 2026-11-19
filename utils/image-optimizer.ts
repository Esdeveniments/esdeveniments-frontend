import { detectImageType, isBackendImageType } from "@utils/image-validation";
import {
  canDecodeImage,
  decodeImage,
  getScaledDimensions,
} from "@utils/image-decode";
import { MAX_ORIGINAL_FILE_BYTES } from "@utils/constants";
import type {
  DecodedImage,
  ImageUploadFailure,
  ImageUploadOptions,
  ImageUploadResult,
} from "types/upload";

const DEFAULT_MAX_DIMENSION = 2560;
// Below this a poster gets hard to read; give up instead of shrinking further.
const DEFAULT_MIN_DIMENSION = 1024;
const SHRINK_FACTOR = 0.75;
const JPEG_QUALITIES = [0.85, 0.75, 0.65, 0.5];

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> =>
  new Promise((resolve) => {
    if (!canvas.toBlob) {
      resolve(null);
      return;
    }
    canvas.toBlob((blob) => resolve(blob && blob.size > 0 ? blob : null), type, quality);
  });

// Tries PNG once (lossless, so quality changes nothing) when the source was a
// PNG, then JPEG on white at falling quality, then the same at smaller sizes.
// A null blob (iOS Safari out of canvas memory) also moves to a smaller size.
async function encodeToFit(
  image: DecodedImage,
  { maxBytes, maxDimension, minDimension }: Required<ImageUploadOptions>,
  tryPng: boolean,
): Promise<Blob | ImageUploadFailure> {
  let encodedAny = false;
  let dimension = Math.min(maxDimension, Math.max(image.width, image.height));
  for (;;) {
    const { width, height } = getScaledDimensions(image.width, image.height, dimension);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "encode_failed";
    try {
      if (tryPng) {
        ctx.drawImage(image.source, 0, 0, width, height);
        const png = await canvasToBlob(canvas, "image/png");
        encodedAny ||= Boolean(png);
        if (png && png.size <= maxBytes) return png;
        ctx.clearRect(0, 0, width, height);
        tryPng = false;
      }
      // JPEG has no alpha: paint white so transparent areas don't turn black.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image.source, 0, 0, width, height);
      for (const quality of JPEG_QUALITIES) {
        const jpeg = await canvasToBlob(canvas, "image/jpeg", quality);
        if (!jpeg) break;
        encodedAny = true;
        if (jpeg.size <= maxBytes) return jpeg;
      }
    } finally {
      // iOS keeps canvas memory until the canvas is shrunk.
      canvas.width = 0;
      canvas.height = 0;
    }
    const next = Math.floor(dimension * SHRINK_FACTOR);
    if (next < minDimension) return encodedAny ? "too_large" : "encode_failed";
    dimension = next;
  }
}

const renameFor = (name: string, type: string): string =>
  `${name.replace(/\.[^.]+$/, "") || "poster"}.${type === "image/png" ? "png" : "jpg"}`;

/**
 * Turns any image the browser can decode into a JPEG or PNG within maxBytes.
 * The type comes from the file's bytes, never from file.type, which Android
 * pickers often leave blank. A JPEG or PNG that already fits and decodes is
 * kept as is.
 */
export async function prepareImageForUpload(
  file: File,
  options: ImageUploadOptions,
): Promise<ImageUploadResult> {
  const {
    maxBytes,
    maxDimension = DEFAULT_MAX_DIMENSION,
    minDimension = Math.min(DEFAULT_MIN_DIMENSION, maxDimension),
  } = options;
  const detectedType = file.size > 0 ? await detectImageType(file) : null;
  const fail = (reason: ImageUploadFailure): ImageUploadResult => ({
    ok: false,
    reason,
    detectedType,
  });
  if (file.size === 0) return fail("empty");
  if (file.size > MAX_ORIGINAL_FILE_BYTES) return fail("original_too_large");

  if (detectedType && isBackendImageType(detectedType) && file.size <= maxBytes) {
    if (!(await canDecodeImage(file))) return fail("undecodable");
    const typed =
      file.type === detectedType
        ? file
        : new File([file], renameFor(file.name, detectedType), {
            type: detectedType,
            lastModified: file.lastModified,
          });
    return { ok: true, file: typed, detectedType };
  }

  let image: DecodedImage;
  try {
    image = await decodeImage(file, maxDimension);
  } catch {
    const isHeic = detectedType === "image/heic" || detectedType === "image/heif";
    return fail(isHeic ? "heic_undecodable" : "undecodable");
  }

  try {
    const blob = await encodeToFit(
      image,
      { maxBytes, maxDimension, minDimension },
      detectedType === "image/png",
    );
    if (typeof blob === "string") return fail(blob);
    return {
      ok: true,
      file: new File([blob], renameFor(file.name, blob.type), {
        type: blob.type,
        lastModified: Date.now(),
      }),
      detectedType,
    };
  } finally {
    image.release();
  }
}
