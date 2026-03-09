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
 * Validate file content by checking magic bytes.
 * Returns true if the file starts with known image magic bytes.
 */
export async function isValidImageContent(file: File): Promise<boolean> {
  try {
    // Read first 12 bytes (enough for all magic byte patterns)
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    for (const { bytes: magicBytes } of IMAGE_MAGIC_BYTES) {
      if (magicBytes.every((byte, index) => bytes[index] === byte)) {
        return true;
      }
    }

    // Special case for WebP: check for "WEBP" at offset 8 after RIFF
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
