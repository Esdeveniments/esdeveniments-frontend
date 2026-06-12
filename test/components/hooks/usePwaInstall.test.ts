import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePwaInstall } from "components/hooks/usePwaInstall";

/**
 * These tests pin the UA-classification that decides which install guidance
 * a user sees. The failure mode they guard against: showing "Add to Home
 * Screen" steps to someone whose browser can't do it (in-app webviews), or
 * pointing iOS users at a Share button that isn't where we say it is.
 */

const originalUserAgent = navigator.userAgent;

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
}

// iPhone Safari and the in-app webviews all carry "iPhone" in the UA.
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)";
const WEBKIT = "AppleWebKit/605.1.15 (KHTML, like Gecko)";

const UA = {
  safariIphone: `${IPHONE} ${WEBKIT} Version/17.0 Mobile/15E148 Safari/604.1`,
  chromeIos: `${IPHONE} ${WEBKIT} CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1`,
  firefoxIos: `${IPHONE} ${WEBKIT} FxiOS/121.0 Mobile/15E148 Safari/605.1.15`,
  whatsapp: `${IPHONE} ${WEBKIT} Mobile/15E148 WhatsApp/2.23.25.84`,
  instagram: `${IPHONE} ${WEBKIT} Mobile/15E148 Instagram 300.0.0.0`,
  tiktok: `${IPHONE} ${WEBKIT} Mobile/15E148 musical_ly_2023 BytedanceWebview/d8a21c`,
  desktopChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

describe("usePwaInstall — install guidance by browser", () => {
  afterEach(() => {
    setUserAgent(originalUserAgent);
  });

  it("shows Safari toolbar share step on iPhone Safari", () => {
    setUserAgent(UA.safariIphone);
    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.showIosInstructions).toBe(true);
    expect(result.current.showOpenInSafariHint).toBe(false);
    expect(result.current.iosShareLocation).toBe("safari");
  });

  it("shows the ⋯ menu share step on Chrome for iOS", () => {
    setUserAgent(UA.chromeIos);
    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.showIosInstructions).toBe(true);
    expect(result.current.iosShareLocation).toBe("menu");
  });

  it("shows the ⋯ menu share step on Firefox for iOS", () => {
    setUserAgent(UA.firefoxIos);
    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.showIosInstructions).toBe(true);
    expect(result.current.iosShareLocation).toBe("menu");
  });

  it("routes the WhatsApp in-app browser to the open-in-Safari hint, not failing A2HS steps", () => {
    setUserAgent(UA.whatsapp);
    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.showOpenInSafariHint).toBe(true);
    expect(result.current.showIosInstructions).toBe(false);
  });

  it("routes the Instagram in-app browser to the open-in-Safari hint", () => {
    setUserAgent(UA.instagram);
    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.showOpenInSafariHint).toBe(true);
    expect(result.current.showIosInstructions).toBe(false);
  });

  it("routes the TikTok in-app browser (musical_ly UA) to the open-in-Safari hint", () => {
    setUserAgent(UA.tiktok);
    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.showOpenInSafariHint).toBe(true);
    expect(result.current.showIosInstructions).toBe(false);
  });

  it("shows no iOS guidance on desktop Chrome (relies on beforeinstallprompt instead)", () => {
    setUserAgent(UA.desktopChrome);
    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.showIosInstructions).toBe(false);
    expect(result.current.showOpenInSafariHint).toBe(false);
    expect(result.current.installState).toBe("not-available");
  });
});
