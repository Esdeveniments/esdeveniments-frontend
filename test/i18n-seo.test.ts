import { describe, expect, it } from "vitest";

import { buildAlternateLinks } from "@utils/i18n-seo";

describe("buildAlternateLinks", () => {
  it("returns hreflang map with localized URLs and x-default", () => {
    const alternates = buildAlternateLinks("https://example.com/foo/bar");

    expect(alternates["ca"]).toMatch(/\/foo\/bar$/);
    expect(alternates["es"]).toMatch(/\/es\/foo\/bar$/);
    expect(alternates["en"]).toMatch(/\/en\/foo\/bar$/);
    expect(alternates["x-default"]).toBe(alternates["ca"]);
  });

  it("handles relative paths safely", () => {
    const alternates = buildAlternateLinks("/baz");

    expect(alternates["ca"]).toMatch(/\/baz$/);
    expect(alternates["es"]).toMatch(/\/es\/baz$/);
    expect(alternates["en"]).toMatch(/\/en\/baz$/);
  });
});


