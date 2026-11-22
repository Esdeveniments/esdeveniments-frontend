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
import AdArticle from "components/ui/adArticle";

describe("GoogleAdsense no-fill fallback", () => {
  let setDisplayAd: ReturnType<typeof vi.fn<(display: boolean) => void>>;
  let mockedOffsetWidth = 360;
  let originalOffsetWidth: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    window.adsbygoogle = [];
    setDisplayAd = vi.fn<(display: boolean) => void>();
    mockedOffsetWidth = 360;
    originalOffsetWidth = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetWidth",
    );
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get: () => mockedOffsetWidth,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    window.__adsScriptSettled = undefined;
    if (originalOffsetWidth) {
      Object.defineProperty(
        HTMLElement.prototype,
        "offsetWidth",
        originalOffsetWidth,
      );
    } else {
      delete (HTMLElement.prototype as unknown as Record<string, unknown>)
        .offsetWidth;
    }
  });

  const renderSlot = () =>
    render(
      <GoogleAdsenseContainer id="s" slot="1" setDisplayAd={setDisplayAd} />,
    );

  it("defers adsbygoogle.push and keeps the slot mounted while the script has not settled", () => {
    renderSlot();
    act(() => vi.advanceTimersByTime(14_000));

    expect(window.adsbygoogle).toHaveLength(0);
    expect(setDisplayAd).not.toHaveBeenCalledWith(false);
  });

  it("never pushes if unmounted before the script settles (route change race)", () => {
    const { unmount } = renderSlot();
    expect(window.adsbygoogle).toHaveLength(0);

    unmount();
    act(() => {
      window.__adsScriptSettled = true;
      window.dispatchEvent(new Event("ads-script-settled"));
    });

    expect(window.adsbygoogle).toHaveLength(0);
  });

  it("pushes and starts the 6 s timer when the script settles", () => {
    renderSlot();
    act(() => vi.advanceTimersByTime(10_000));
    expect(window.adsbygoogle).toHaveLength(0);

    act(() => {
      window.__adsScriptSettled = true;
      window.dispatchEvent(new Event("ads-script-settled"));
    });

    expect(window.adsbygoogle).toHaveLength(1);
    act(() => vi.advanceTimersByTime(5999));
    expect(setDisplayAd).not.toHaveBeenCalledWith(false);
    act(() => vi.advanceTimersByTime(1));
    expect(setDisplayAd).toHaveBeenCalledWith(false);
  });

  it("pushes and starts the 6 s timer at once when the script already settled", () => {
    window.__adsScriptSettled = true;
    renderSlot();

    expect(window.adsbygoogle).toHaveLength(1);
    act(() => vi.advanceTimersByTime(5999));
    expect(setDisplayAd).not.toHaveBeenCalledWith(false);
    act(() => vi.advanceTimersByTime(1));
    expect(setDisplayAd).toHaveBeenCalledWith(false);
  });

  it("waits for positive width via ResizeObserver instead of pushing into a 0px slot", () => {
    mockedOffsetWidth = 0;
    window.__adsScriptSettled = true;

    let resizeCallback: ResizeObserverCallback | null = null;
    const disconnect = vi.fn();
    class FakeResizeObserver {
      constructor(cb: ResizeObserverCallback) {
        resizeCallback = cb;
      }
      observe() {}
      unobserve() {}
      disconnect = disconnect;
    }
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);

    renderSlot();
    expect(window.adsbygoogle).toHaveLength(0);

    // Still 0px after 2 s: does not push
    act(() => {
      resizeCallback?.([], {} as ResizeObserver);
      vi.advanceTimersByTime(2000);
    });
    expect(window.adsbygoogle).toHaveLength(0);

    // Gains width: pushes once, disconnects observer, and gets a full 6 s fill window
    mockedOffsetWidth = 320;
    act(() => {
      resizeCallback?.([], {} as ResizeObserver);
    });
    expect(window.adsbygoogle).toHaveLength(1);
    expect(disconnect).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(5999));
    expect(setDisplayAd).not.toHaveBeenCalledWith(false);
    act(() => vi.advanceTimersByTime(1));
    expect(setDisplayAd).toHaveBeenCalledWith(false);
  });

  it("collapses without pushing if width stays 0px for 6 s", () => {
    mockedOffsetWidth = 0;
    window.__adsScriptSettled = true;
    renderSlot();

    expect(window.adsbygoogle).toHaveLength(0);
    act(() => vi.advanceTimersByTime(6000));
    expect(window.adsbygoogle).toHaveLength(0);
    expect(setDisplayAd).toHaveBeenCalledWith(false);
  });

  it("collapses after the watchdog when no loader ever runs", () => {
    renderSlot();
    act(() => vi.advanceTimersByTime(15_000));

    expect(window.adsbygoogle).toHaveLength(0);
    expect(setDisplayAd).toHaveBeenCalledWith(false);
  });

  it("only attaches class=adsbygoogle to sized slots so hidden/0px slots cannot hijack another slot's push", () => {
    window.__adsScriptSettled = true;
    const widthById: Record<string, number> = { "slot-hidden": 0, "slot-visible": 360 };
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get(this: HTMLElement) {
        return widthById[this.id] ?? 360;
      },
    });

    const { container } = render(
      <>
        <GoogleAdsenseContainer id="slot-hidden" slot="1" setDisplayAd={setDisplayAd} />
        <GoogleAdsenseContainer id="slot-visible" slot="2" setDisplayAd={setDisplayAd} />
      </>,
    );

    const hiddenIns = container.querySelector("#slot-hidden");
    const visibleIns = container.querySelector("#slot-visible");
    expect(hiddenIns).not.toHaveClass("adsbygoogle");
    expect(visibleIns).toHaveClass("adsbygoogle");
    expect(window.adsbygoogle).toHaveLength(1);
  });

  it("renders AdArticle wrapper with w-full so flex containers never shrink it to 0px", () => {
    const { container } = render(<AdArticle slot="123" />);
    expect(container.firstElementChild).toHaveClass("flex", "w-full");
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
