import { describe, it, expect } from "vitest";
import { isMalformedEventSlug } from "../utils/event-slug-quality";

describe("isMalformedEventSlug", () => {
  it("returns true for empty / nullish slugs", () => {
    expect(isMalformedEventSlug("")).toBe(true);
    expect(isMalformedEventSlug(undefined)).toBe(true);
    expect(isMalformedEventSlug(null)).toBe(true);
  });

  it("returns false for normal Catalan event slugs", () => {
    expect(isMalformedEventSlug("concert-de-jazz-a-barcelona")).toBe(false);
    expect(isMalformedEventSlug("festa-major-de-vic-2026")).toBe(false);
    expect(isMalformedEventSlug("3-de-juny-del-2026")).toBe(false);
    // 80-char realistic upper bound
    expect(
      isMalformedEventSlug(
        "fira-internacional-del-circ-trapezi-de-reus-edicio-2026-juny-juliol-agost"
      )
    ).toBe(false);
  });

  it("flags the production leak pattern (real GSC sample)", () => {
    const real =
      "bibliobustitle-linkhttpswwwsbgcatactualitatagenda2400-bibliobushtmllink-descriptioncdata-2400-fri-27-mar-2026-123436-0100-2026-06-03-103000-2026-06-03-130000-3-de-juny-del-2026-b2a26174-2bda-4659-af86-fac94d055bed";
    expect(isMalformedEventSlug(real)).toBe(true);
  });

  it("flags individual feed-leak tokens", () => {
    expect(isMalformedEventSlug("event-httpswww-foo-bar")).toBe(true);
    expect(isMalformedEventSlug("event-httpwww-foo-bar")).toBe(true);
    expect(isMalformedEventSlug("event-linkhttps-foo")).toBe(true);
    expect(isMalformedEventSlug("event-linkdescription-foo")).toBe(true);
    expect(isMalformedEventSlug("event-cdata-foo")).toBe(true);
  });

  it("is case-insensitive on token detection", () => {
    expect(isMalformedEventSlug("event-HTTPSWWW-foo")).toBe(true);
    expect(isMalformedEventSlug("event-CDATA-foo")).toBe(true);
  });

  it("flags any slug longer than 120 chars", () => {
    const long = "a".repeat(121);
    expect(isMalformedEventSlug(long)).toBe(true);
    const justUnder = "a".repeat(120);
    expect(isMalformedEventSlug(justUnder)).toBe(false);
  });
});
