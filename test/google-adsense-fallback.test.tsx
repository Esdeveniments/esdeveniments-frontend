import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";

vi.mock("@lib/context/AdContext", () => ({
  ADS_SCRIPT_SETTLED_EVENT: "ads-script-settled",
  useAdContext: () => ({
    adsAllowed: true,
    observeVisibility: (_el: Element, callback: () => void) => callback(),
    unobserveVisibility: () => {},
    observeMutations: () => {},
    unobserveMutations: () => {},
  }),
}));

import GoogleAdsenseContainer from "components/ui/GoogleAdsense";

describe("GoogleAdsense no-fill fallback", () => {
  let setDisplayAd: ReturnType<typeof vi.fn<(display: boolean) => void>>;

  beforeEach(() => {
    vi.useFakeTimers();
    window.adsbygoogle = [];
    setDisplayAd = vi.fn<(display: boolean) => void>();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.__adsScriptSettled = undefined;
  });

  const renderSlot = () =>
    render(
      <GoogleAdsenseContainer id="s" slot="1" setDisplayAd={setDisplayAd} />,
    );

  it("keeps a queued slot mounted while the script has not settled", () => {
    renderSlot();
    act(() => vi.advanceTimersByTime(14_000));

    expect(window.adsbygoogle).toHaveLength(1);
    expect(setDisplayAd).not.toHaveBeenCalledWith(false);
  });

  it("starts the 6 s timer when the script settles", () => {
    renderSlot();
    act(() => vi.advanceTimersByTime(10_000));
    act(() => {
      window.dispatchEvent(new Event("ads-script-settled"));
    });

    act(() => vi.advanceTimersByTime(5999));
    expect(setDisplayAd).not.toHaveBeenCalledWith(false);
    act(() => vi.advanceTimersByTime(1));
    expect(setDisplayAd).toHaveBeenCalledWith(false);
  });

  it("starts the 6 s timer at once when the script already settled", () => {
    window.__adsScriptSettled = true;
    renderSlot();

    act(() => vi.advanceTimersByTime(5999));
    expect(setDisplayAd).not.toHaveBeenCalledWith(false);
    act(() => vi.advanceTimersByTime(1));
    expect(setDisplayAd).toHaveBeenCalledWith(false);
  });

  it("collapses after the watchdog when no loader ever runs", () => {
    renderSlot();
    act(() => vi.advanceTimersByTime(15_000));

    expect(setDisplayAd).toHaveBeenCalledWith(false);
  });
});

describe("GoogleScriptsHeavy ads script", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("@lib/context/AdContext");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_ADS", "ca-pub-test");
    window.__adsScriptSettled = undefined;
    window.__autoAdsInitialized = true;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    document.head.querySelectorAll("script").forEach((s) => s.remove());
    window.__adsScriptSettled = undefined;
    window.__autoAdsInitialized = undefined;
  });

  const renderHeavy = async (adsScriptReady: boolean) => {
    const { default: GoogleScriptsHeavy } = await import(
      "app/GoogleScriptsHeavy"
    );
    return render(
      <GoogleScriptsHeavy adsAllowed adsScriptReady={adsScriptReady} />,
    );
  };

  const adsScript = () =>
    document.head.querySelector<HTMLScriptElement>(
      'script[src*="adsbygoogle.js"]',
    );

  it("does not inject the script before the trigger fires", async () => {
    await renderHeavy(false);
    expect(adsScript()).toBeNull();
  });

  it.each(["load", "error"] as const)(
    "marks the script settled and fires the event on %s",
    async (outcome) => {
      const onSettled = vi.fn();
      window.addEventListener("ads-script-settled", onSettled);
      await renderHeavy(true);

      const script = adsScript();
      expect(script).not.toBeNull();
      script![outcome === "load" ? "onload" : "onerror"]!(new Event(outcome));

      expect(window.__adsScriptSettled).toBe(true);
      expect(onSettled).toHaveBeenCalledTimes(1);
      window.removeEventListener("ads-script-settled", onSettled);
    },
  );
});
