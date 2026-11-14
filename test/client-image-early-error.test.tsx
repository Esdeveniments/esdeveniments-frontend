import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";
import ClientImage from "@components/ui/common/image/ClientImage";

// An image that fails before hydration fires `error` before React listens.
// ClientImage must still retry and then show the placeholder.
describe("ClientImage error before hydration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function mockImage(state: { complete: boolean; naturalWidth: number; currentSrc: string }) {
    const proto = HTMLImageElement.prototype;
    vi.spyOn(proto, "complete", "get").mockReturnValue(state.complete);
    vi.spyOn(proto, "naturalWidth", "get").mockReturnValue(state.naturalWidth);
    vi.spyOn(proto, "currentSrc", "get").mockReturnValue(state.currentSrc);
  }

  it("shows the placeholder for an http image that already failed", async () => {
    vi.useFakeTimers();
    mockImage({ complete: true, naturalWidth: 0, currentSrc: "https://x/a.jpg" });
    const { container } = render(<ClientImage title="Pessebre" image="http://example.com/a.jpg" alt="" />);
    // Two retries (1 s, then 2 s), each scheduled after the previous render.
    for (const ms of [1000, 2000]) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });
    }
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it("keeps a lazy image that hasn't started loading", () => {
    mockImage({ complete: true, naturalWidth: 0, currentSrc: "" });
    const { container } = render(<ClientImage title="Pessebre" image="https://example.com/a.jpg" alt="" />);
    expect(container.querySelector("img")).not.toBeNull();
  });
});

// fitxers.sabadell.cat only accepts connections from Spain, so the proxy's
// server can't fetch its images while a visitor's browser can.
describe("ClientImage when the proxy can't fetch the image", () => {
  const ORIGINAL = "https://fitxers.example.cat/agenda/concert.jpg";

  it("loads the original https image in the browser, then the placeholder if that fails too", () => {
    const { container } = render(<ClientImage title="Concert" image={ORIGINAL} alt="" />);
    const proxied = container.querySelector("img")!;
    expect(proxied.getAttribute("src")).toContain("/api/image-proxy");
    expect(proxied.hasAttribute("referrerpolicy")).toBe(false);

    fireEvent.error(proxied);
    const direct = container.querySelector("img")!;
    expect(direct.getAttribute("src")).toBe(ORIGINAL);
    // The council's server never learns which of our pages the visitor is on.
    expect(direct.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(container.querySelector("source")).toBeNull();

    fireEvent.error(direct);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it("never loads an http original directly", () => {
    vi.useFakeTimers();
    const { container } = render(<ClientImage title="Concert" image="http://fitxers.example.cat/a.jpg" alt="" />);

    fireEvent.error(container.querySelector("img")!);

    expect(container.querySelector("img")?.getAttribute("src")).toContain("/api/image-proxy");
  });
});
