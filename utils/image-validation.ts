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

const ascii = (bytes: Uint8Array, start: number): string =>
  String.fromCharCode(...bytes.subarray(start, start + 4));

const AVIF_BRANDS = new Set(["avif", "avis"]);
const HEIC_BRANDS = new Set(["heic", "heix", "heim", "heis", "hevc", "hevx", "hevm", "hevs"]);
const HEIF_BRANDS = new Set(["mif1", "msf1"]);

// HEIC and AVIF are ISO-BMFF files: "ftyp" at offset 4, then the major brand
// and, after a 4-byte version, the compatible brands up to the box size.
// A generic major brand (mif1) needs the compatible list to tell them apart.
function detectIsoBmffImageType(bytes: Uint8Array): string | null {
  if (bytes.length < 12 || ascii(bytes, 4) !== "ftyp") return null;
  const boxSize = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  const end = Math.min(bytes.length, boxSize > 0 ? boxSize : bytes.length);
  const brands = [ascii(bytes, 8)];
  for (let offset = 16; offset + 4 <= end; offset += 4) brands.push(ascii(bytes, offset));
  if (brands.some((brand) => AVIF_BRANDS.has(brand))) return "image/avif";
  if (brands.some((brand) => HEIC_BRANDS.has(brand))) return "image/heic";
  if (brands.some((brand) => HEIF_BRANDS.has(brand))) return "image/heif";
  return null;
}

/**
 * Detect the real image type from magic bytes.
 * Returns null when the file starts with no known image signature.
 */
export async function detectImageType(file: File): Promise<string | null> {
  try {
    // 64 bytes covers the fixed signatures and an ISO-BMFF ftyp brand list.
    const buffer = await file.slice(0, 64).arrayBuffer();
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

    return detectIsoBmffImageType(bytes);
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
