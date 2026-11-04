// Image magic bytes for server-side content validation.
// Client-provided MIME types can be spoofed, so we verify actual file content.
const IMAGE_MAGIC_BYTES: { type: string; bytes: number[] }[] = [
  { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  {
    type: "image/png",
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { type: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  // WebP handled separately below (RIFF header is shared with WAV, AVI, etc.)
];

/**
 * Detect the real image type from magic bytes.
 * Returns null when the file starts with no known image signature.
 */
export async function detectImageType(file: File): Promise<string | null> {
  try {
    // Read first 12 bytes (enough for all magic byte patterns)
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    for (const { type, bytes: magicBytes } of IMAGE_MAGIC_BYTES) {
      if (magicBytes.every((byte, index) => bytes[index] === byte)) {
        return type;
      }
    }

    // Special case for WebP: check for "RIFF" at bytes 0-3 and "WEBP" at bytes 8-11
    const isRiffHeader =
      bytes[0] === 0x52 && // R
      bytes[1] === 0x49 && // I
      bytes[2] === 0x46 && // F
      bytes[3] === 0x46; // F

    const isWebpType =
      bytes[8] === 0x57 && // W
      bytes[9] === 0x45 && // E
      bytes[10] === 0x42 && // B
      bytes[11] === 0x50; // P

    if (isRiffHeader && isWebpType) {
      return "image/webp";
    }

    return null;
  } catch {
    return null;
  }
}

/** The backend accepts JPEG and PNG only. */
export function isBackendImageType(type: string | null): boolean {
  return type === "image/jpeg" || type === "image/png";
}

/**
 * The optional image part of a server action's FormData: null when absent,
 * the File when its content is a real JPEG or PNG. Throws otherwise, including
 * for an empty file.
 */
export async function getValidatedImageFile(
  value: FormDataEntryValue | null | undefined,
): Promise<File | null> {
  if (!(value instanceof File)) return null;
  if (!value.type.startsWith("image/") || !isBackendImageType(await detectImageType(value))) {
    throw new Error("The uploaded file is not a valid image");
  }
  return value;
}
