import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHydration } from "components/hooks/useHydration";

describe("useHydration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false initially (before hydration)", () => {
    // Mock requestAnimationFrame so it never fires
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 0);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    const { result } = renderHook(() => useHydration());

    // Before rAF fires, should be false
    expect(result.current).toBe(false);
  });

  it("returns true after requestAnimationFrame fires", async () => {
    let rafCallback: FrameRequestCallback | undefined;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    const { result } = renderHook(() => useHydration());

    expect(result.current).toBe(false);

    // Simulate the rAF callback
    if (rafCallback) {
      rafCallback(performance.now());
    }

    // Wait for the state update
    await vi.waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("cancels animation frame on unmount", () => {
    const cancelSpy = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => {});
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(42);

    const { unmount } = renderHook(() => useHydration());

    unmount();

    expect(cancelSpy).toHaveBeenCalledWith(42);
  });
});
