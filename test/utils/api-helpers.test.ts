import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getApiUrl,
  getApiOrigin,
  isApiUrlConfigured,
} from "@utils/api-helpers";
import apiDefaults from "@config/api-defaults.json";

// getApiUrl/getApiOrigin read process.env at call time, so per-test env changes
// take effect without resetting modules.
const originalEnv = { ...process.env };

describe("utils/api-helpers — API base resolution", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.API_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("getApiUrl", () => {
    it("prefers the runtime API_URL over the build-time NEXT_PUBLIC_API_URL", () => {
      process.env.API_URL = "https://runtime.example.com/api";
      process.env.NEXT_PUBLIC_API_URL = "https://build.example.com/api";
      expect(getApiUrl()).toBe("https://runtime.example.com/api");
    });

    it("falls back to NEXT_PUBLIC_API_URL when API_URL is unset", () => {
      process.env.NEXT_PUBLIC_API_URL = "https://build.example.com/api";
      expect(getApiUrl()).toBe("https://build.example.com/api");
    });

    it("falls back to the JSON default when neither is set", () => {
      expect(getApiUrl()).toBe(apiDefaults.apiUrl);
    });

    it("falls back to NEXT_PUBLIC_API_URL when API_URL is malformed", () => {
      process.env.API_URL = "not a url";
      process.env.NEXT_PUBLIC_API_URL = "https://build.example.com/api";
      vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(getApiUrl()).toBe("https://build.example.com/api");
    });

    it("warns only once for a repeated malformed value", () => {
      process.env.API_URL = "not-a-url-dedup";
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      getApiUrl();
      getApiUrl();
      getApiUrl();
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it("trims surrounding whitespace from API_URL", () => {
      process.env.API_URL = "  https://runtime.example.com/api  ";
      expect(getApiUrl()).toBe("https://runtime.example.com/api");
    });
  });

  describe("getApiOrigin", () => {
    it("uses the API_URL origin when set", () => {
      process.env.API_URL = "https://runtime.example.com/api";
      expect(getApiOrigin()).toBe("https://runtime.example.com");
    });

    it("falls back to NEXT_PUBLIC_API_URL when API_URL is malformed (does not skip to default)", () => {
      // Distinct value per malformed test: the warn is deduped per (var, value).
      process.env.API_URL = "not-a-url-origin";
      process.env.NEXT_PUBLIC_API_URL = "https://build.example.com/api";
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(getApiOrigin()).toBe("https://build.example.com");
      // The warning must name the offending var so a misconfig is diagnosable.
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("API_URL"),
        "not-a-url-origin",
      );
    });

    it("falls back to the default origin when neither is set", () => {
      expect(getApiOrigin()).toBe(new URL(apiDefaults.apiUrl).origin);
    });
  });

  describe("isApiUrlConfigured", () => {
    it("is true when API_URL is set", () => {
      process.env.API_URL = "https://runtime.example.com/api";
      expect(isApiUrlConfigured()).toBe(true);
    });

    it("is true when only NEXT_PUBLIC_API_URL is set", () => {
      process.env.NEXT_PUBLIC_API_URL = "https://build.example.com/api";
      expect(isApiUrlConfigured()).toBe(true);
    });

    it("is false when neither is set", () => {
      expect(isApiUrlConfigured()).toBe(false);
    });

    it("is false when only a malformed API_URL is set", () => {
      process.env.API_URL = "not a url";
      expect(isApiUrlConfigured()).toBe(false);
    });
  });
});
