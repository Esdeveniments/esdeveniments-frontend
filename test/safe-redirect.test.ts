import { describe, it, expect } from "vitest";
import { getSafeRedirect } from "@utils/safe-redirect";

describe("getSafeRedirect", () => {
  it("allows same-origin relative paths", () => {
    expect(getSafeRedirect("/publica")).toBe("/publica");
    expect(getSafeRedirect("/perfil/gerard-rovellat")).toBe(
      "/perfil/gerard-rovellat"
    );
    expect(getSafeRedirect("/preferits?foo=bar")).toBe("/preferits?foo=bar");
  });

  it("rejects protocol-relative URLs (open-redirect vector)", () => {
    expect(getSafeRedirect("//evil.example")).toBeUndefined();
    expect(getSafeRedirect("//evil.example/path")).toBeUndefined();
  });

  it("rejects absolute URLs", () => {
    expect(getSafeRedirect("https://evil.example")).toBeUndefined();
    expect(getSafeRedirect("http://evil.example")).toBeUndefined();
  });

  it("rejects non-path strings and non-strings", () => {
    expect(getSafeRedirect("publica")).toBeUndefined();
    expect(getSafeRedirect("")).toBeUndefined();
    expect(getSafeRedirect(undefined)).toBeUndefined();
    expect(getSafeRedirect(["/publica", "/preferits"])).toBeUndefined();
  });
});
