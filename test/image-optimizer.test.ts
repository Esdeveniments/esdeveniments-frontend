import { describe, it, expect, vi, afterEach } from "vitest";
import { compressImageIfNeeded } from "@utils/image-optimizer";

const MB = 1024 * 1024;

// jsdom can't decode or encode images: fake the Image load and make
// canvas.toBlob return a size per format, like Chrome does (PNG ignores quality).
function stubCanvas(sizes: Record<string, number>) {
  const fills: string[] = [];
  const ctx = {
    drawImage: vi.fn(),
    fillRect: vi.fn(function (
      this: { fillStyle: string; globalCompositeOperation: string },
    ) {
      // A white fill drawn with source-over would cover the poster.
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
    .mockImplementation((cb, type = "image/png") => {
      cb(new Blob([new Uint8Array(sizes[type])], { type }));
    });
  vi.stubGlobal(
    "Image",
    class {
      width = 1414;
      height = 2000;
      onload: (() => void) | null = null;
      set src(_: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
  return { toBlob, fills };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("compressImageIfNeeded", () => {
  it("re-encodes a PNG that stays over the limit as JPEG on white", async () => {
    const { toBlob, fills } = stubCanvas({ "image/png": 7 * MB, "image/jpeg": 1 * MB });
    const file = new File([new Uint8Array(6 * MB)], "poster.png", { type: "image/png" });

    const out = await compressImageIfNeeded(file, { maxBytes: 2 * MB });

    expect(out?.type).toBe("image/jpeg");
    expect(out?.name).toBe("poster-compressed.jpg");
    expect(fills).toEqual(["#ffffff destination-over"]);
    // One PNG encode (quality does nothing), then JPEG.
    expect(toBlob.mock.calls.map((c) => c[1])).toEqual(["image/png", "image/jpeg"]);
  });

  it("keeps a PNG as PNG when it fits after resizing", async () => {
    const { fills } = stubCanvas({ "image/png": 1 * MB, "image/jpeg": 0.5 * MB });
    const file = new File([new Uint8Array(3 * MB)], "poster.png", { type: "image/png" });

    const out = await compressImageIfNeeded(file, { maxBytes: 2 * MB });

    expect(out?.type).toBe("image/png");
    expect(fills).toEqual([]);
  });
});
