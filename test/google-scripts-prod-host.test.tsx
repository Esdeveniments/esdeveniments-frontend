import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { renderToString } from "react-dom/server";

const { isProductionHostMock } = vi.hoisted(() => ({ isProductionHostMock: vi.fn() }));

vi.mock("next/script", () => ({
  default: ({ id, src }: { id?: string; src?: string }) => (
    <script data-testid={id ?? src} />
  ),
}));
vi.mock("@lib/context/AdContext", () => ({ useAdContext: () => ({ adsAllowed: false }) }));
vi.mock("@utils/production-host", () => ({ isProductionHost: isProductionHostMock }));
vi.mock("@utils/browser", () => ({
  onFirstInteractionOrTimeout: () => () => {},
  scheduleIdleCallback: () => () => {},
}));

async function loadGoogleScripts() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_ANALYTICS", "G-TEST");
  return (await import("../app/GoogleScripts")).default;
}

describe("GoogleScripts production-host gate", () => {
  beforeEach(() => isProductionHostMock.mockReset());
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("loads GA on the production host", async () => {
    isProductionHostMock.mockReturnValue(true);
    const GoogleScripts = await loadGoogleScripts();
    render(<GoogleScripts />);
    expect(screen.getByTestId("google-analytics-consent")).toBeInTheDocument();
  });

  it("does not load GA on other hosts", async () => {
    isProductionHostMock.mockReturnValue(false);
    const GoogleScripts = await loadGoogleScripts();
    render(<GoogleScripts />);
    expect(screen.queryByTestId("google-analytics-consent")).not.toBeInTheDocument();
  });

  it("renders nothing on the server, so hydration matches", async () => {
    isProductionHostMock.mockReturnValue(true);
    const GoogleScripts = await loadGoogleScripts();
    expect(renderToString(<GoogleScripts />)).toBe("");
  });
});
