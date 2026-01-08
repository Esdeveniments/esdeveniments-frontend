import { describe, it, expect } from "vitest";
import {
  getOptimalImageQuality,
  getServerImageQuality,
  getQualityPreset,
  getOptimalImageWidth,
  getOptimalImageSizes,
  QUALITY_PRESETS,
} from "@utils/image-quality";

describe("image-quality utils", () => {
  describe("getOptimalImageQuality", () => {
    it("returns 50 for regular external images (default)", () => {
      expect(getOptimalImageQuality({})).toBe(50);
    });

    it("returns 60 for priority external images (LCP)", () => {
      expect(getOptimalImageQuality({ isPriority: true })).toBe(60);
    });

    it("returns custom quality when explicitly provided", () => {
      expect(getOptimalImageQuality({ customQuality: 80 })).toBe(80);
    });

    it("clamps custom quality to 0-100 range", () => {
      expect(getOptimalImageQuality({ customQuality: 150 })).toBe(100);
      expect(getOptimalImageQuality({ customQuality: -10 })).toBe(0);
    });

    it("caps network quality at 50 for external non-priority images", () => {
      expect(
        getOptimalImageQuality({ networkQuality: 85, isExternal: true })
      ).toBe(50);
      expect(
        getOptimalImageQuality({ networkQuality: 30, isExternal: true })
      ).toBe(30);
    });

    it("uses network quality directly for internal images", () => {
      expect(
        getOptimalImageQuality({ networkQuality: 85, isExternal: false })
      ).toBe(85);
    });

    it("prioritizes custom quality over all other settings", () => {
      expect(
        getOptimalImageQuality({
          isPriority: true,
          isExternal: true,
          networkQuality: 90,
          customQuality: 45,
        })
      ).toBe(45);
    });

    // Edge cases
    it("handles networkQuality at boundary values (0, 50, 100)", () => {
      // At 0: should return 0 for external non-priority
      expect(
        getOptimalImageQuality({ networkQuality: 0, isExternal: true })
      ).toBe(0);
      // At 50: should return 50 (at cap)
      expect(
        getOptimalImageQuality({ networkQuality: 50, isExternal: true })
      ).toBe(50);
      // At 100: should cap at 50 for external
      expect(
        getOptimalImageQuality({ networkQuality: 100, isExternal: true })
      ).toBe(50);
    });

    it("clamps networkQuality to valid range", () => {
      // Negative values clamped to 0
      expect(
        getOptimalImageQuality({ networkQuality: -50, isExternal: false })
      ).toBe(0);
      // Values over 100 clamped to 100
      expect(
        getOptimalImageQuality({ networkQuality: 200, isExternal: false })
      ).toBe(100);
    });

    it("handles undefined isPriority and isExternal with defaults", () => {
      // Default: isExternal=true, isPriority=false → capped at 50
      expect(getOptimalImageQuality({ networkQuality: 70 })).toBe(50);
    });

    it("returns 60 for priority internal images (same as external LCP)", () => {
      // Priority flag affects external images, internal uses network quality
      expect(
        getOptimalImageQuality({
          isPriority: true,
          isExternal: false,
          networkQuality: 70,
        })
      ).toBe(70);
    });
  });

  describe("getServerImageQuality", () => {
    it("returns 85 for high network quality", () => {
      expect(getServerImageQuality("high")).toBe(85);
    });

    it("returns 75 for medium network quality", () => {
      expect(getServerImageQuality("medium")).toBe(75);
    });

    it("returns 50 for low network quality", () => {
      expect(getServerImageQuality("low")).toBe(50);
    });

    it("returns 75 for unknown network quality", () => {
      expect(getServerImageQuality("unknown")).toBe(75);
    });

    it("defaults to 75 when no argument provided", () => {
      expect(getServerImageQuality()).toBe(75);
    });

    it("handles explicit undefined", () => {
      expect(getServerImageQuality(undefined)).toBe(75);
    });
  });

  describe("QUALITY_PRESETS", () => {
    it("has correct preset values matching next.config.js allowed qualities", () => {
      // All values must be in: [35, 50, 60, 75, 85]
      const allowedQualities = [35, 50, 60, 75, 85];

      expect(allowedQualities).toContain(QUALITY_PRESETS.LCP_EXTERNAL);
      expect(allowedQualities).toContain(QUALITY_PRESETS.EXTERNAL_HIGH);
      expect(allowedQualities).toContain(QUALITY_PRESETS.EXTERNAL_STANDARD);
      expect(allowedQualities).toContain(QUALITY_PRESETS.EXTERNAL_MOBILE);
      expect(allowedQualities).toContain(QUALITY_PRESETS.INTERNAL_HIGH);
      expect(allowedQualities).toContain(QUALITY_PRESETS.INTERNAL_STANDARD);
      expect(allowedQualities).toContain(QUALITY_PRESETS.EMERGENCY);
    });

    it("verifies specific preset values", () => {
      expect(QUALITY_PRESETS.LCP_EXTERNAL).toBe(60);
      expect(QUALITY_PRESETS.EXTERNAL_HIGH).toBe(50);
      expect(QUALITY_PRESETS.EXTERNAL_STANDARD).toBe(50);
      expect(QUALITY_PRESETS.EXTERNAL_MOBILE).toBe(35);
      expect(QUALITY_PRESETS.INTERNAL_HIGH).toBe(85);
      expect(QUALITY_PRESETS.INTERNAL_STANDARD).toBe(75);
      expect(QUALITY_PRESETS.EMERGENCY).toBe(35);
    });
  });

  describe("getQualityPreset", () => {
    it("returns correct preset values", () => {
      expect(getQualityPreset("LCP_EXTERNAL")).toBe(60);
      expect(getQualityPreset("EXTERNAL_HIGH")).toBe(50);
      expect(getQualityPreset("EXTERNAL_STANDARD")).toBe(50);
      expect(getQualityPreset("INTERNAL_HIGH")).toBe(85);
      expect(getQualityPreset("INTERNAL_STANDARD")).toBe(75);
      expect(getQualityPreset("NETWORK_SLOW")).toBe(35);
      expect(getQualityPreset("NETWORK_FAST")).toBe(85);
      expect(getQualityPreset("EMERGENCY")).toBe(35);
    });

    it("returns EXTERNAL_STANDARD (50) for unknown presets", () => {
      // TypeScript would normally prevent this, but testing runtime behavior
      expect(getQualityPreset("UNKNOWN" as never)).toBe(50);
    });
  });

  describe("getOptimalImageWidth", () => {
    it("returns 700 for card context (default)", () => {
      expect(getOptimalImageWidth()).toBe(700);
      expect(getOptimalImageWidth("card")).toBe(700);
    });

    it("returns 1200 for hero context", () => {
      expect(getOptimalImageWidth("hero")).toBe(1200);
    });

    it("returns 500 for list context", () => {
      expect(getOptimalImageWidth("list")).toBe(500);
    });

    it("returns 1000 for detail context", () => {
      expect(getOptimalImageWidth("detail")).toBe(1000);
    });
  });

  describe("getOptimalImageSizes", () => {
    it("returns responsive sizes string for card context (default)", () => {
      const sizes = getOptimalImageSizes();
      expect(sizes).toContain("92vw");
      expect(sizes).toContain("672px");
    });

    it("returns responsive sizes string for hero context", () => {
      const sizes = getOptimalImageSizes("hero");
      expect(sizes).toContain("100vw");
      expect(sizes).toContain("50vw");
    });

    it("returns responsive sizes string for list context", () => {
      const sizes = getOptimalImageSizes("list");
      expect(sizes).toContain("90vw");
      expect(sizes).toContain("22vw");
    });

    it("returns responsive sizes string for detail context", () => {
      const sizes = getOptimalImageSizes("detail");
      expect(sizes).toContain("100vw");
      expect(sizes).toContain("40vw");
    });

    it("includes proper breakpoint structure", () => {
      const sizes = getOptimalImageSizes("card");
      // Should have multiple breakpoints with (max-width: Xpx) pattern
      const breakpoints = sizes.match(/\(max-width: \d+px\)/g);
      expect(breakpoints).toBeTruthy();
      expect(breakpoints!.length).toBeGreaterThanOrEqual(3);
    });

    it("all contexts return non-empty strings", () => {
      const contexts = ["card", "hero", "list", "detail"] as const;
      for (const context of contexts) {
        const sizes = getOptimalImageSizes(context);
        expect(sizes.length).toBeGreaterThan(0);
        expect(typeof sizes).toBe("string");
      }
    });

    it("all widths are positive integers", () => {
      const contexts = ["card", "hero", "list", "detail"] as const;
      for (const context of contexts) {
        const width = getOptimalImageWidth(context);
        expect(Number.isInteger(width)).toBe(true);
        expect(width).toBeGreaterThan(0);
      }
    });
  });
});
