import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";

const state = vi.hoisted(() => ({ adsAllowed: false }));

vi.mock("next/script", () => ({
  default: ({ id, src }: { id?: string; src?: string }) => (
    <script data-testid={id ?? src} />
  ),
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
    const win = window as unknown as { dataLayer?: unknown; gtag?: unknown };
    delete win.dataLayer;
    delete win.gtag;
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("waits for the CMP: keeps shim ready, defers gtag.js, sends no denied update", async () => {
    await setup();
    expect(screen.getByTestId("google-analytics-consent")).toBeInTheDocument();
    expect(screen.queryByTestId("google-analytics-gtag")).not.toBeInTheDocument();
    expect(commands()).toContainEqual(["consent", "default", expect.objectContaining({ wait_for_update: 1000 })]);
    expect(commands().some(([cmd, action]) => cmd === "consent" && action === "update")).toBe(false);
  });

  it("loads gtag.js after consent is granted and queues a single update without duplicate page_view", async () => {
    const rerender = await setup();
    expect(screen.queryByTestId("google-analytics-gtag")).not.toBeInTheDocument();
    state.adsAllowed = true;
    act(rerender);
    expect(screen.getByTestId("google-analytics-gtag")).toBeInTheDocument();
    expect(commands()).toContainEqual(["consent", "update", expect.objectContaining({ analytics_storage: "granted" })]);
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
