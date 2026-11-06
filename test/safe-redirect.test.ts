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

  it("rejects backslash normalization bypasses", () => {
    // Browsers treat "\" as "/", so these resolve to protocol-relative URLs.
    expect(getSafeRedirect("/\\evil.example")).toBeUndefined();
    expect(getSafeRedirect("/\\/evil.example")).toBeUndefined();
    expect(getSafeRedirect("/foo\\bar")).toBeUndefined();
    expect(getSafeRedirect("\\\\evil.example")).toBeUndefined();
  });

  it("rejects tab, CR and LF (stripped by the URL parser into //)", () => {
    expect(getSafeRedirect("/\t/x.invalid")).toBeUndefined();
    expect(getSafeRedirect("/\n/x.invalid")).toBeUndefined();
    expect(getSafeRedirect("/\r/x.invalid")).toBeUndefined();
    expect(getSafeRedirect("/%09/x.invalid")).toBeUndefined();
  });

  it("rejects dot-dot segments", () => {
    expect(getSafeRedirect("/barcelona/..//x.invalid")).toBeUndefined();
    expect(getSafeRedirect("/barcelona?category=..//x.invalid")).toBeUndefined();
    expect(getSafeRedirect("/a/%2e%2e/b")).toBeUndefined();
  });

  it("keeps /preferits", () => {
    expect(getSafeRedirect("/preferits")).toBe("/preferits");
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
