// @vitest-environment-options {"url":"https://www.esdeveniments.cat/catalunya"}
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sendGoogleEvent } from "@utils/analytics";
import type { WindowWithGtag } from "types/common";

const win = () => window as unknown as WindowWithGtag;
const commands = () =>
  win().dataLayer.map((c) => Array.from(c as ArrayLike<unknown>));

describe("sendGoogleEvent on the production host", () => {
  beforeEach(() => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    delete (window as unknown as { dataLayer?: unknown }).dataLayer;
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_ANALYTICS", "G-TEST");
  });
  afterEach(() => vi.unstubAllEnvs());

  // gtag.js drops events queued before 'config' (FCP and TTFB were lost).
  it("queues 'config' before an event sent before gtag.js loads", () => {
    sendGoogleEvent("web_vitals", { metric: "FCP" });
    const names = commands().map((c) => c[0]);
    expect(names).toEqual(["consent", "js", "config", "event"]);
    expect(commands()[2]).toEqual(["config", "G-TEST"]);
  });

  // GA sends page_view itself: on config, and on history changes (enhanced
  // measurement "page changes"), for every visitor. A param here that turns
  // it off would drop page views for visitors who deny consent.
  it("pushes 'config' without params, so GA sends the page_view", () => {
    sendGoogleEvent("x", {});
    expect(commands().find((c) => c[0] === "config")).toHaveLength(2);
  });

  it("pushes 'config' only once", () => {
    sendGoogleEvent("a", {});
    sendGoogleEvent("b", {});
    expect(commands().filter((c) => c[0] === "config")).toHaveLength(1);
  });
});
