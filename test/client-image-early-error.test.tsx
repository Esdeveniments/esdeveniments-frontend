import { describe, it, expect, vi, afterEach } from "vitest";
import { act, render } from "@testing-library/react";
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

  it("shows the placeholder for an image that already failed", async () => {
    vi.useFakeTimers();
    mockImage({ complete: true, naturalWidth: 0, currentSrc: "https://x/a.jpg" });
    const { container } = render(<ClientImage title="Pessebre" image="https://example.com/a.jpg" alt="" />);
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
