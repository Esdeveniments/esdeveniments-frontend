import { describe, it, expect } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { beforeSendClient, SENTRY_IGNORE_ERRORS } from "@utils/sentry-helpers";

const isIgnored = (message: string) =>
  SENTRY_IGNORE_ERRORS.some((pattern) =>
    typeof pattern === "string" ? message.includes(pattern) : pattern.test(message),
  );

const makeClientEvent = (
  type: string,
  value: string,
  frames: Array<{ filename?: string; abs_path?: string }>,
): ErrorEvent =>
  ({
    exception: {
      values: [{ type, value, stacktrace: { frames } }],
    },
  }) as ErrorEvent;

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

describe("beforeSendClient", () => {
  it("drops extension-wrapped errors even when the innermost frame is first-party", () => {
    const event = makeClientEvent("TypeError", "Failed to fetch (www.esdeveniments.cat)", [
      { filename: "chrome-extension://hoklmmgfnpapgjgcpechhaamimifchmp/frame_ant/frame_ant.js" },
      { filename: "app:///_next/static/chunks/3xeo6htzcdcyx.js" },
    ]);
    expect(beforeSendClient(event, {})).toBeNull();
  });

  it("drops Google Funding Choices focus-loop RangeErrors", () => {
    const event = makeClientEvent("RangeError", "Maximum call stack size exceeded.", [
      { filename: "https://fundingchoicesmessages.google.com/f/AGSKWxU6Yk" },
      { filename: "app:///_next/static/chunks/3xeo6htzcdcyx.js" },
    ]);
    expect(beforeSendClient(event, {})).toBeNull();
  });

  it("keeps first-party fetch errors and non-loop crashes", () => {
    const firstPartyFetch = makeClientEvent("TypeError", "Failed to fetch", [
      { filename: "app:///_next/static/chunks/3xeo6htzcdcyx.js" },
    ]);
    const tcfCallbackBug = makeClientEvent("TypeError", "Cannot read properties of undefined", [
      { filename: "https://fundingchoicesmessages.google.com/f/AGSKWxU6Yk" },
      { filename: "app:///_next/static/chunks/3xeo6htzcdcyx.js" },
    ]);
    const firstPartyLoop = makeClientEvent("RangeError", "Maximum call stack size exceeded.", [
      { filename: "app:///_next/static/chunks/3xeo6htzcdcyx.js" },
    ]);

    expect(beforeSendClient(firstPartyFetch, {})).not.toBeNull();
    expect(beforeSendClient(tcfCallbackBug, {})).not.toBeNull();
    expect(beforeSendClient(firstPartyLoop, {})).not.toBeNull();
  });
});
