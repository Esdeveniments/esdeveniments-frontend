import { describe, it, expect } from "vitest";
import {
  eventTag,
  placeTag,
  newsPlaceTag,
  newsSlugTag,
} from "@lib/cache/tags";

// The malformed event id seen in production logs (a whole RSS link + description
// collapsed into the slug) — this is what blew past Next's 256-char tag limit.
const MALFORMED_SLUG =
  "bibliobustitle-linkhttpswwwsantcugatsesgarriguescatactualitatagenda4010-bibliobushtmllink-descriptioncdata-4010-mon-17-nov-2025-112258-0100-2026-07-24-153000-2026-07-24-183000-c-rasa-de-lamell-24-de-juliol-del-2026-af53a4ee-e521-4ecb-b26a-11a7e95729b7";

describe("cache tag builders", () => {
  it("passes short slugs through verbatim", () => {
    expect(eventTag("concert-major-2026")).toBe("event:concert-major-2026");
    expect(placeTag("barcelona")).toBe("place:barcelona");
  });

  it("keeps oversized tags within Next.js's 256-char limit", () => {
    const tag = eventTag(MALFORMED_SLUG);
    expect(tag.length).toBeLessThanOrEqual(256);
    expect(tag.startsWith("event:")).toBe(true);
  });

  it("is deterministic for the same slug (set and revalidate must match)", () => {
    expect(eventTag(MALFORMED_SLUG)).toBe(eventTag(MALFORMED_SLUG));
  });

  it("distinguishes two oversized slugs that share a long prefix", () => {
    const a = `${MALFORMED_SLUG}-aaaaaaaa`;
    const b = `${MALFORMED_SLUG}-bbbbbbbb`;
    expect(eventTag(a)).not.toBe(eventTag(b));
  });

  it("bounds every slug-based builder", () => {
    for (const tag of [
      eventTag(MALFORMED_SLUG),
      placeTag(MALFORMED_SLUG),
      newsPlaceTag(MALFORMED_SLUG),
      newsSlugTag(MALFORMED_SLUG),
    ]) {
      expect(tag.length).toBeLessThanOrEqual(256);
    }
  });
});
