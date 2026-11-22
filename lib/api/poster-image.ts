import "server-only";
import sharp from "sharp";
import { POSTER_AI_MAX_DIMENSION } from "@utils/constants";
import type { PosterNormalizeImageResult } from "types/api/poster";

// Cap decoded pixels at 25 MP so a tiny compressed PNG bomb can't spike RSS
// on the single production container serving the whole site.
const MAX_DECODE_PIXELS = 25_000_000;
const MAX_ACTIVE_DECODES = 2;
const MAX_QUEUED_DECODES = 2;
const JPEG_QUALITY = 82;

let activeDecodes = 0;
const waitQueue: Array<() => void> = [];

function acquireDecodeSlot(): Promise<() => void> | null {
  if (activeDecodes < MAX_ACTIVE_DECODES) {
    activeDecodes += 1;
    let released = false;
    return Promise.resolve(() => {
      if (released) return;
      released = true;
      activeDecodes -= 1;
      const next = waitQueue.shift();
      if (next) next();
    });
  }

  if (waitQueue.length >= MAX_QUEUED_DECODES) {
    return null;
  }

  return new Promise((resolve) => {
    waitQueue.push(() => {
      activeDecodes += 1;
      let released = false;
      resolve(() => {
        if (released) return;
        released = true;
        activeDecodes -= 1;
        const next = waitQueue.shift();
        if (next) next();
      });
    });
  });
}

/**
 * Normalizes an uploaded poster before forwarding to external vision AI:
 * - Bounded concurrency pool (2 active + 2 queued; overflow returns `overloaded`)
 * - `sharp.cache(false)` + 25 MP pixel ceiling to protect container memory
 * - `.rotate()` auto-orients from EXIF BEFORE stripping all EXIF/GPS metadata
 * - Fits longest edge inside 1280x1280 without enlargement (bounds panoramas too)
 * - Flattens alpha onto white, converts to sRGB, encodes clean JPEG
 */
export async function normalizePosterForAi(
  inputBuffer: Buffer,
): Promise<PosterNormalizeImageResult> {
  const slotPromise = acquireDecodeSlot();
  if (!slotPromise) {
    return { ok: false, reason: "overloaded" };
  }

  const release = await slotPromise;
  try {
    sharp.cache(false);
    const { data, info } = await sharp(inputBuffer, {
      limitInputPixels: MAX_DECODE_PIXELS,
      failOn: "error",
    })
      .rotate()
      .resize(POSTER_AI_MAX_DIMENSION, POSTER_AI_MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .toColorspace("srgb")
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: false })
      .toBuffer({ resolveWithObject: true });

    if (!data.length || !info.width || !info.height) {
      return { ok: false, reason: "invalid_image" };
    }

    return {
      ok: true,
      buffer: data,
      mimeType: "image/jpeg",
      width: info.width,
      height: info.height,
    };
  } catch {
    return { ok: false, reason: "invalid_image" };
  } finally {
    release();
  }
}

/** Test-only helper to inspect concurrency pool state. */
export function getPosterDecodePoolStats(): {
  active: number;
  queued: number;
} {
  return { active: activeDecodes, queued: waitQueue.length };
}
