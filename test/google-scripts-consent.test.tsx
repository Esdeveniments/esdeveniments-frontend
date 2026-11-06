import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";

const state = vi.hoisted(() => ({ adsAllowed: false, onGtagLoad: undefined as (() => void) | undefined }));

vi.mock("next/script", () => ({
  default: ({ id, onLoad }: { id?: string; onLoad?: () => void }) => {
    if (id === "google-analytics-gtag") state.onGtagLoad = onLoad;
    return null;
  },
}));
vi.mock("@lib/context/AdContext", () => ({ useAdContext: () => ({ adsAllowed: state.adsAllowed }) }));
vi.mock("@utils/production-host", () => ({ isProductionHost: () => true }));
vi.mock("@utils/browser", () => ({
  onFirstInteractionOrTimeout: () => () => {},
  scheduleIdleCallback: () => () => {},
}));
vi.mock("./../app/GoogleScriptsHeavy", () => ({ default: () => null }));

type Entry = IArguments | Record<string, unknown>;
const dataLayer = () => (window as unknown as { dataLayer: Entry[] }).dataLayer;
const commands = () =>
  dataLayer()
    .filter((e): e is IArguments => typeof (e as IArguments).length === "number")
    .map((e) => [e[0], e[1], e[2]]);

async function setup() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_ANALYTICS", "G-TEST");
  // In the app the inline GTAG_SHIM or web-vitals init installs gtag first.
  (await import("@utils/analytics")).ensureGtag();
  const GoogleScripts = (await import("../app/GoogleScripts")).default;
  const view = render(<GoogleScripts />);
  return () => view.rerender(<GoogleScripts />);
}

describe("GoogleScripts consent updates", () => {
  beforeEach(() => {
    state.adsAllowed = false;
    state.onGtagLoad = undefined;
    const win = window as unknown as { dataLayer?: unknown; gtag?: unknown };
    delete win.dataLayer;
    delete win.gtag;
    vi.useFakeTimers({ toFake: ["performance"] });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("waits for the CMP: no denied update before it has decided", async () => {
    await setup();
    expect(commands()).toContainEqual(["consent", "default", expect.objectContaining({ wait_for_update: 1000 })]);
    expect(commands().some(([cmd, action]) => cmd === "consent" && action === "update")).toBe(false);
  });

  it("grants before gtag.js has loaded: update only, gtag sends the held page_view", async () => {
    const rerender = await setup();
    state.adsAllowed = true;
    act(rerender);
    expect(commands()).toContainEqual(["consent", "update", expect.objectContaining({ analytics_storage: "granted" })]);
    expect(commands()).not.toContainEqual(["event", "page_view", undefined]);
  });

  it("grants after gtag's wait ran out: sends page_view after the update", async () => {
    const rerender = await setup();
    act(() => state.onGtagLoad?.());
    vi.advanceTimersByTime(1500);
    state.adsAllowed = true;
    act(rerender);
    const cmds = commands();
    const update = cmds.findIndex(([c, a]) => c === "consent" && a === "update");
    const pageView = cmds.findIndex(([c, a]) => c === "event" && a === "page_view");
    expect(update).toBeGreaterThan(-1);
    expect(pageView).toBeGreaterThan(update);
  });

  it("grants within gtag's wait: no extra page_view", async () => {
    const rerender = await setup();
    act(() => state.onGtagLoad?.());
    vi.advanceTimersByTime(300);
    state.adsAllowed = true;
    act(rerender);
    expect(commands()).not.toContainEqual(["event", "page_view", undefined]);
  });

  it("sends a denied update when consent is revoked", async () => {
    const rerender = await setup();
    state.adsAllowed = true;
    act(rerender);
    state.adsAllowed = false;
    act(rerender);
    const updates = commands().filter(([c, a]) => c === "consent" && a === "update");
    expect(updates.map(([, , v]) => (v as { analytics_storage: string }).analytics_storage)).toEqual(["granted", "denied"]);
  });
});
