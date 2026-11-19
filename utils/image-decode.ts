import type { DecodedImage } from "types/upload";

const loadImageElement = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to decode image"));
    image.src = url;
  });

// Loads the whole file once, so a header-only fake or a cut-off download
// fails here instead of uploading as a broken poster.
export async function canDecodeImage(file: Blob): Promise<boolean> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImageElement(url);
    await image.decode?.();
    return Boolean(image.naturalWidth || image.width);
  } catch {
    return false;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const getScaledDimensions = (
  width: number,
  height: number,
  maxDimension: number,
) => {
  const maxSide = Math.max(width, height);
  if (maxSide <= maxDimension) return { width, height };
  const scale = maxDimension / maxSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

let bitmapResize: Promise<boolean> | undefined;

// Safari before 17.2 ignores the resize options without an error and would
// hold a full 48 MP bitmap, so check once on a tiny canvas.
const supportsBitmapResize = (): Promise<boolean> => {
  bitmapResize ??= (async () => {
    if (typeof createImageBitmap !== "function") return false;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 2;
      const bitmap = await createImageBitmap(canvas, { resizeWidth: 1, resizeHeight: 1 });
      const resized = bitmap.width === 1;
      bitmap.close();
      return resized;
    } catch {
      return false;
    }
  })();
  return bitmapResize;
};

// Decodes through an object URL (a data URL copies the whole file into a
// string first). The <img> load gives the oriented size from the header; where
// createImageBitmap can resize, it scales while decoding, so a 48 MP photo
// never sits in memory at full size. Otherwise the <img> is drawn scaled.
export async function decodeImage(file: Blob, maxDimension: number): Promise<DecodedImage> {
  const url = URL.createObjectURL(file);
  const revoke = () => URL.revokeObjectURL(url);
  let image: HTMLImageElement;
  try {
    image = await loadImageElement(url);
  } catch (error) {
    revoke();
    throw error;
  }
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) {
    revoke();
    throw new Error("Image has no dimensions");
  }
  const target = getScaledDimensions(width, height, maxDimension);
  if (target.width < width && (await supportsBitmapResize())) {
    try {
      const bitmap = await createImageBitmap(file, {
        resizeWidth: target.width,
        resizeHeight: target.height,
        resizeQuality: "high",
        imageOrientation: "from-image",
      });
      // Guard against a browser applying the resize before the EXIF rotation.
      if (Math.abs(bitmap.width / bitmap.height - width / height) < 0.02) {
        revoke();
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          release: () => bitmap.close(),
        };
      }
      bitmap.close();
    } catch {
      // Fall back to drawing the <img>.
    }
  }
  return { source: image, width, height, release: revoke };
}
