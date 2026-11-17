import { describe, it, expect } from "vitest";
import { SENTRY_IGNORE_ERRORS } from "@utils/sentry-helpers";

const isIgnored = (message: string) =>
  SENTRY_IGNORE_ERRORS.some((pattern) =>
    typeof pattern === "string" ? message.includes(pattern) : pattern.test(message),
  );

describe("SENTRY_IGNORE_ERRORS", () => {
  it("drops the duplicate AdSense pushes Google raises from its own script", () => {
    expect(
      isIgnored(
        "TagError: adsbygoogle.push() error: Only one 'enable_page_level_ads' allowed per page.",
      ),
    ).toBe(true);
    expect(
      isIgnored(
        "TagError: adsbygoogle.push() error: All 'ins' elements in the DOM with class=adsbygoogle already have ads in them.",
      ),
    ).toBe(true);
  });

  it("keeps the AdSense errors that point at our layout or config", () => {
    expect(
      isIgnored("TagError: adsbygoogle.push() error: No slot size for availableWidth=0"),
    ).toBe(false);
    expect(isIgnored("TagError: adsbygoogle.push() error: Ad client is missing from the slot.")).toBe(
      false,
    );
  });
});
