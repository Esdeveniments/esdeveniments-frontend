import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPageMeta } from "@components/partials/seo-meta";

const ORIGINAL_ENV = { ...process.env };

describe("buildPageMeta robots policy", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://esdeveniments.cat";
    process.env.NEXT_PUBLIC_VERCEL_ENV = "production";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  const baseArgs = {
    title: "T",
    description: "D",
    canonical: "https://esdeveniments.cat/begues/avui",
  };

  it("uses the default robots policy when no override is passed", () => {
    const meta = buildPageMeta(baseArgs);
    expect(meta.robots).not.toBe("noindex, follow");
    expect(meta.robots).not.toContain("noindex");
  });

  it("propagates a noindex robotsOverride into the metadata", () => {
    const meta = buildPageMeta({
      ...baseArgs,
      robotsOverride: "noindex, follow",
    });
    expect(meta.robots).toBe("noindex, follow");
  });

  it("forces noindex,nofollow on non-production hosts regardless of override", () => {
    // Positive evidence of non-production wins over caller-supplied override
    // so staging/preview never leak content marked indexable.
    process.env.NEXT_PUBLIC_SITE_URL = "https://staging.esdeveniments.cat";
    const meta = buildPageMeta({
      ...baseArgs,
      robotsOverride: undefined, // even default-policy callers get noindex,nofollow
    });
    expect(meta.robots).toBe("noindex, nofollow");
  });

  it("forces noindex,nofollow on preview env regardless of override", () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = "preview";
    const meta = buildPageMeta({
      ...baseArgs,
      robotsOverride: "noindex, follow",
    });
    expect(meta.robots).toBe("noindex, nofollow");
  });
});
