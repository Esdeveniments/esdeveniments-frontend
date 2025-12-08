const DEFAULT_MAX_DIMENSION = 2560;
const DEFAULT_INITIAL_QUALITY = 0.85;
const DEFAULT_MIN_QUALITY = 0.5;
const DEFAULT_QUALITY_STEP = 0.05;

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
        return;
      }
      reject(new Error("Unable to read image as data URL"));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = src;
  });

const getScaledDimensions = (
  width: number,
  height: number,
  maxDimension: number
) => {
  if (!width || !height) {
    return { width: 0, height: 0 };
  }
  const maxSide = Math.max(width, height);
  if (maxSide <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / maxSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> =>
  new Promise((resolve) => {
    if (!canvas.toBlob) {
      resolve(null);
      return;
    }
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });

const createCompressedFilename = (name: string, mime: string): string => {
  const baseName = name.replace(/\.[^.]+$/, "");
  const extension = mime === "image/webp" ? "webp" : "jpg";
  return `${baseName}-compressed.${extension}`;
};

export async function compressImageIfNeeded(
  file: File,
  options: {
    maxBytes: number;
    maxDimension?: number;
    initialQuality?: number;
    minQuality?: number;
    qualityStep?: number;
  }
): Promise<File | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }
  const { maxBytes } = options;
  if (!file.type.startsWith("image/") || file.size <= maxBytes) {
    return null;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(dataUrl);
    const { width, height } = getScaledDimensions(
      image.width,
      image.height,
      options.maxDimension ?? DEFAULT_MAX_DIMENSION
    );

    if (!width || !height) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return null;
    }

    ctx.drawImage(image, 0, 0, width, height);

    const targetType =
      file.type === "image/webp" ? "image/webp" : "image/jpeg";
    let quality = options.initialQuality ?? DEFAULT_INITIAL_QUALITY;
    const minQuality = options.minQuality ?? DEFAULT_MIN_QUALITY;
    const step = options.qualityStep ?? DEFAULT_QUALITY_STEP;
    let blob = await canvasToBlob(canvas, targetType, quality);

    while (blob && blob.size > maxBytes && quality > minQuality) {
      quality = Math.max(minQuality, quality - step);
      blob = await canvasToBlob(canvas, targetType, quality);
    }

    if (!blob || blob.size >= file.size || blob.size > maxBytes) {
      return null;
    }

    const compressedFile = new File([blob], createCompressedFilename(file.name, blob.type), {
      type: blob.type,
      lastModified: Date.now(),
    });

    return compressedFile;
  } catch (error) {
    console.warn("compressImageIfNeeded: failed to optimize image", error);
    return null;
  }
}
