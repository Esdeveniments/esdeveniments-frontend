import { describe, it, expect, vi, beforeAll } from "vitest";

const callbacks: Record<
  string,
  {
    cb: (m: unknown) => void;
    opts?: { generateTarget?: (n: Node | null) => string | undefined };
  }
> = {};
vi.mock("web-vitals/attribution", () => {
  const capture =
    (name: string) => (cb: (m: unknown) => void, opts?: never) => {
      callbacks[name] = { cb, opts };
    };
  return {
    onCLS: capture("CLS"),
    onFCP: capture("FCP"),
    onINP: capture("INP"),
    onLCP: capture("LCP"),
    onTTFB: capture("TTFB"),
  };
});
const sendGoogleEvent = vi.fn();
vi.mock("@utils/analytics", () => ({ sendGoogleEvent }));

beforeAll(async () => {
  const { initWebVitals } = await import("@utils/webVitals");
  initWebVitals();
});

describe("web vitals attribution", () => {
  it("sends the INP target, interaction type and load state", () => {
    callbacks.INP.cb({
      name: "INP",
      delta: 312.4,
      rating: "poor",
      navigationType: "navigate",
      attribution: {
        interactionTarget: "button.pressable-chip",
        interactionType: "pointer",
        loadState: "complete",
      },
    });
    expect(sendGoogleEvent).toHaveBeenLastCalledWith("web_vitals", {
      metric: "INP",
      value: 312,
      rating: "poor",
      navigation_type: "navigate",
      element: "button.pressable-chip",
      interaction_type: "pointer",
      load_state: "complete",
    });
  });

  it("names the INP target by its control, not the icon inside it", () => {
    document.body.innerHTML =
      '<button class="chip"><svg class="icon"><path/></svg></button>';
    expect(
      callbacks.INP.opts?.generateTarget?.(document.querySelector("path")),
    ).toBe("button.chip");
  });

  it("sends the LCP element and the CLS shift element", () => {
    callbacks.LCP.cb({
      name: "LCP",
      delta: 2100,
      rating: "needs-improvement",
      navigationType: "navigate",
      attribution: { target: "img.hero" },
    });
    expect(sendGoogleEvent).toHaveBeenLastCalledWith(
      "web_vitals",
      expect.objectContaining({ metric: "LCP", element: "img.hero" }),
    );
    callbacks.CLS.cb({
      name: "CLS",
      delta: 0.0123,
      rating: "good",
      navigationType: "navigate",
      attribution: { largestShiftTarget: "div.banner" },
    });
    expect(sendGoogleEvent).toHaveBeenLastCalledWith(
      "web_vitals",
      expect.objectContaining({
        metric: "CLS",
        value: 12,
        element: "div.banner",
      }),
    );
  });
});
