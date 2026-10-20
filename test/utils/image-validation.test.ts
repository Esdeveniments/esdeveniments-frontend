import { describe, expect, it } from "vitest";
import { getValidatedImageFile } from "@utils/image-validation";

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]);

describe("getValidatedImageFile", () => {
  it("returns null when the part is absent", async () => {
    expect(await getValidatedImageFile(null)).toBeNull();
    expect(await getValidatedImageFile(undefined)).toBeNull();
    expect(await getValidatedImageFile("1")).toBeNull();
  });

  it("returns a real image file", async () => {
    const file = new File([PNG_BYTES], "a.png", { type: "image/png" });
    expect(await getValidatedImageFile(file)).toBe(file);
  });

  it("throws for an empty file instead of silently dropping it", async () => {
    const file = new File([], "a.png", { type: "image/png" });
    await expect(getValidatedImageFile(file)).rejects.toThrow(
      "not a valid image",
    );
  });

  it("throws for non-image content labelled as an image", async () => {
    const file = new File(["<html>"], "a.png", { type: "image/png" });
    await expect(getValidatedImageFile(file)).rejects.toThrow(
      "not a valid image",
    );
  });
});
