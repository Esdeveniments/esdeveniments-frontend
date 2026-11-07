import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const gtag = vi.fn();

async function run(referrer: string, path: string) {
  Object.defineProperty(document, "referrer", { value: referrer, configurable: true });
  window.history.replaceState({}, "", path);
  // Fresh module: setUserProperties applies once per locale per page load.
  vi.resetModules();
  const { setUserProperties } = await import("@utils/userProperties");
  setUserProperties("ca");
}

function sentReferrerCategory() {
  return gtag.mock.calls.find(([cmd]) => cmd === "set")?.[2].referrer_category;
}

function aiReferrerEvents() {
  return gtag.mock.calls.filter(([cmd, name]) => cmd === "event" && name === "ai_referrer");
}

describe("setUserProperties referrer detection", () => {
  beforeEach(() => {
    gtag.mockClear();
    sessionStorage.clear();
    (window as unknown as { gtag: typeof gtag }).gtag = gtag;
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("treats a ChatGPT link without a referrer as AI traffic (utm_source)", async () => {
    await run("", "/barcelona?utm_source=chatgpt.com");

    expect(sentReferrerCategory()).toBe("ai");
    expect(aiReferrerEvents()).toEqual([
      ["event", "ai_referrer", { referrer_domain: "chatgpt.com" }],
    ]);
  });

  it("detects an AI referrer header", async () => {
    await run("https://chatgpt.com/", "/barcelona");

    expect(sentReferrerCategory()).toBe("ai");
    expect(aiReferrerEvents()).toHaveLength(1);
  });

  it("keeps direct traffic and non-AI utm sources as direct", async () => {
    await run("", "/barcelona?utm_source=newsletter");

    expect(sentReferrerCategory()).toBe("direct");
    expect(aiReferrerEvents()).toHaveLength(0);
  });
});
