import { describe, it, expect, vi, afterEach } from "vitest";
import { prepareImageForUpload } from "@utils/image-optimizer";
import { detectImageType } from "@utils/image-validation";

const MB = 1024 * 1024;
const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0];
const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));
// ISO-BMFF ftyp box: size, "ftyp", major brand, version, compatible brands.
const ftyp = (major: string, compatible: string[]) => {
  const size = 16 + compatible.length * 4;
  return [0, 0, 0, size, ...ascii("ftyp"), ...ascii(major), 0, 0, 0, 0, ...compatible.flatMap(ascii)];
};

function fileOf(head: number[], size: number, name: string, type: string) {
  const bytes = new Uint8Array(size);
  bytes.set(head);
  return new File([bytes], name, { type });
}

// jsdom can't decode or encode images: fake the <img> load and make
// canvas.toBlob return a size per format, like Chrome does (PNG ignores quality).
function stubCanvas(
  sizes: Record<string, number | null>,
  { decodes = true, width = 1414, height = 2000 } = {},
) {
  const fills: string[] = [];
  const ctx = {
    drawImage: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(function (
      this: { fillStyle: string; globalCompositeOperation: string },
    ) {
      fills.push(`${this.fillStyle} ${this.globalCompositeOperation}`);
    }),
    fillStyle: "",
    globalCompositeOperation: "source-over",
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
  const toBlob = vi
    .spyOn(HTMLCanvasElement.prototype, "toBlob")
    .mockImplementation(function (this: HTMLCanvasElement, cb, type = "image/png") {
      const size = sizes[type];
      cb(size == null ? null : new Blob([new Uint8Array(size)], { type }));
    });
  vi.stubGlobal(
    "Image",
    class {
      naturalWidth = width;
      naturalHeight = height;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_: string) {
        queueMicrotask(() => (decodes ? this.onload?.() : this.onerror?.()));
      }
    },
  );
  const revoke = vi.fn();
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = () => "blob:x";
      static revokeObjectURL = revoke;
    },
  );
  vi.stubGlobal("createImageBitmap", undefined);
  return { toBlob, fills, revoke };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("detectImageType", () => {
  it.each([
    ["HEIC from an iPhone", ftyp("heic", ["mif1", "heic"]), "image/heic"],
    ["HEIC behind a generic mif1 brand", ftyp("mif1", ["heic"]), "image/heic"],
    ["AVIF behind mif1", ftyp("mif1", ["avif", "miaf"]), "image/avif"],
    ["plain HEIF", ftyp("mif1", ["miaf"]), "image/heif"],
    ["an MP4 video", ftyp("isom", ["mp41"]), null],
  ])("reads %s", async (_, head, expected) => {
    expect(await detectImageType(fileOf(head, 64, "x", ""))).toBe(expected);
  });
});

describe("prepareImageForUpload", () => {
  it("keeps a small JPEG untouched", async () => {
    const { toBlob } = stubCanvas({});
    const file = fileOf(JPEG_HEAD, 1 * MB, "poster.jpg", "image/jpeg");

    const out = await prepareImageForUpload(file, { maxBytes: 2 * MB });

    expect(out).toEqual({ ok: true, file, detectedType: "image/jpeg" });
    expect(toBlob).not.toHaveBeenCalled();
  });

  it("types a small JPEG that an Android picker left blank", async () => {
    stubCanvas({});
    const file = fileOf(JPEG_HEAD, 1 * MB, "IMG_1234", "");

    const out = await prepareImageForUpload(file, { maxBytes: 2 * MB });

    expect(out.ok && [out.file.type, out.file.name]).toEqual(["image/jpeg", "IMG_1234.jpg"]);
  });

  it("re-encodes a PNG that stays over the limit as JPEG on white", async () => {
    const { toBlob, fills } = stubCanvas({ "image/png": 7 * MB, "image/jpeg": 1 * MB });
    const file = fileOf(PNG_HEAD, 6 * MB, "poster.png", "image/png");

    const out = await prepareImageForUpload(file, { maxBytes: 2 * MB });

    expect(out.ok && [out.file.type, out.file.name]).toEqual(["image/jpeg", "poster.jpg"]);
    expect(fills).toEqual(["#ffffff source-over"]);
    // One PNG encode (quality does nothing), then JPEG.
    expect(toBlob.mock.calls.map((c) => c[1])).toEqual(["image/png", "image/jpeg"]);
  });

  it("keeps a PNG as PNG when it fits after resizing", async () => {
    const { fills } = stubCanvas({ "image/png": 1 * MB, "image/jpeg": 0.5 * MB });
    const file = fileOf(PNG_HEAD, 3 * MB, "poster.png", "image/png");

    const out = await prepareImageForUpload(file, { maxBytes: 2 * MB });

    expect(out.ok && out.file.type).toBe("image/png");
    expect(fills).toEqual([]);
  });

  it("converts a small WebP or HEIC the browser can decode to JPEG", async () => {
    stubCanvas({ "image/jpeg": 0.4 * MB });
    const file = fileOf(ftyp("heic", ["mif1"]), 1 * MB, "IMG_0001.HEIC", "");

    const out = await prepareImageForUpload(file, { maxBytes: 2 * MB });

    expect(out.ok && [out.file.type, out.file.name, out.detectedType]).toEqual([
      "image/jpeg",
      "IMG_0001.jpg",
      "image/heic",
    ]);
  });

  it("shrinks the size when no JPEG quality fits", async () => {
    const { toBlob } = stubCanvas({ "image/jpeg": 3 * MB }, { width: 3000, height: 4000 });
    const file = fileOf(JPEG_HEAD, 9 * MB, "big.jpg", "image/jpeg");

    const out = await prepareImageForUpload(file, { maxBytes: 2 * MB });

    // 2560 → 1920 → 1440 → 1080, four qualities each, then the floor.
    expect(out).toEqual({ ok: false, reason: "too_large", detectedType: "image/jpeg" });
    expect(toBlob).toHaveBeenCalledTimes(16);
  });

  it("shrinks an avatar down to its own, smaller floor", async () => {
    const { toBlob } = stubCanvas({ "image/jpeg": 3 * MB }, { width: 3000, height: 4000 });
    const file = fileOf(JPEG_HEAD, 9 * MB, "big.jpg", "image/jpeg");

    const out = await prepareImageForUpload(file, {
      maxBytes: 2 * MB,
      maxDimension: 1024,
      minDimension: 256,
    });

    // 1024 → 768 → 576 → 432 → 324, four qualities each, then the floor.
    expect(out).toMatchObject({ ok: false, reason: "too_large" });
    expect(toBlob).toHaveBeenCalledTimes(20);
  });

  it("refuses an original over 25 MB before decoding it", async () => {
    const { toBlob, revoke } = stubCanvas({ "image/jpeg": MB });
    const file = fileOf(JPEG_HEAD, 64, "huge.jpg", "image/jpeg");
    Object.defineProperty(file, "size", { value: 25 * MB + 1 });

    const out = await prepareImageForUpload(file, { maxBytes: 2 * MB });

    expect(out).toEqual({ ok: false, reason: "original_too_large", detectedType: "image/jpeg" });
    expect(toBlob).not.toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();
  });

  it("moves to a smaller size when the canvas returns no blob", async () => {
    const { toBlob } = stubCanvas({ "image/jpeg": null }, { width: 3000, height: 4000 });
    const file = fileOf(JPEG_HEAD, 9 * MB, "big.jpg", "image/jpeg");

    const out = await prepareImageForUpload(file, { maxBytes: 2 * MB });

    expect(out).toMatchObject({ ok: false, reason: "encode_failed" });
    expect(toBlob).toHaveBeenCalledTimes(4);
  });

  it.each([
    ["an empty file", [], 0, "empty"],
    ["bytes the browser can't decode", [1, 2, 3], 3 * MB, "undecodable"],
    ["a small JPEG that is cut off", JPEG_HEAD, 1 * MB, "undecodable"],
    ["a HEIC the browser can't decode", ftyp("heic", ["mif1"]), 3 * MB, "heic_undecodable"],
  ])("fails clearly on %s", async (_, head, size, reason) => {
    const { revoke } = stubCanvas({}, { decodes: false });

    const out = await prepareImageForUpload(fileOf(head, size, "x.jpg", ""), { maxBytes: 2 * MB });

    expect(out).toMatchObject({ ok: false, reason });
    if (size > 0) expect(revoke).toHaveBeenCalledTimes(1);
  });
});
