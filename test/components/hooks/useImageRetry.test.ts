import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useImageRetry } from "components/hooks/useImageRetry";

describe("useImageRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("returns initial state", () => {
    const { result } = renderHook(() => useImageRetry());

    expect(result.current.retryCount).toBe(0);
    expect(result.current.hasError).toBe(false);
    expect(result.current.imageLoaded).toBe(false);
  });

  it("handleLoad marks image as loaded", () => {
    const { result } = renderHook(() => useImageRetry());

    act(() => {
      result.current.handleLoad();
    });

    expect(result.current.imageLoaded).toBe(true);
    expect(result.current.hasError).toBe(false);
    expect(result.current.showSkeleton).toBe(false);
  });

  it("handleError increments retryCount with exponential backoff", () => {
    const { result } = renderHook(() => useImageRetry(3));

    // First error - triggers 1s delay
    act(() => {
      result.current.handleError();
    });

    expect(result.current.retryCount).toBe(0); // not yet incremented (pending timeout)

    // Advance past the first retry delay (1000ms)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.retryCount).toBe(1);
  });

  it("sets hasError after max retries exhausted", () => {
    const { result } = renderHook(() => useImageRetry(1));

    // First error → retry (retryCount goes to 1 after timeout)
    act(() => {
      result.current.handleError();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.retryCount).toBe(1);

    // Second error → max retries (1) reached, sets hasError
    act(() => {
      result.current.handleError();
    });

    expect(result.current.hasError).toBe(true);
  });

  it("getImageKey generates unique key based on retry count", () => {
    const { result } = renderHook(() => useImageRetry());

    const key0 = result.current.getImageKey("test.jpg");
    expect(key0).toBe("test.jpg-0");

    // Trigger a retry
    act(() => {
      result.current.handleError();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const key1 = result.current.getImageKey("test.jpg");
    expect(key1).toBe("test.jpg-1");
  });

  it("reset restores all state to initial", () => {
    const { result } = renderHook(() => useImageRetry());

    // Load, then reset
    act(() => {
      result.current.handleLoad();
    });
    expect(result.current.imageLoaded).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.retryCount).toBe(0);
    expect(result.current.hasError).toBe(false);
    expect(result.current.imageLoaded).toBe(false);
    expect(result.current.showSkeleton).toBe(false);
  });

  it("shows skeleton after loading delay when image not yet loaded", () => {
    const { result } = renderHook(() => useImageRetry());

    // Initially no skeleton
    expect(result.current.showSkeleton).toBe(false);

    // Advance past loading delay (150ms)
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.showSkeleton).toBe(true);
  });

  it("does not show skeleton if image loads before delay", () => {
    const { result } = renderHook(() => useImageRetry());

    // Load before the skeleton delay
    act(() => {
      vi.advanceTimersByTime(50);
      result.current.handleLoad();
    });

    act(() => {
      vi.advanceTimersByTime(200); // past loading delay
    });

    expect(result.current.showSkeleton).toBe(false);
  });

  it("default maxRetries is 2", () => {
    const { result } = renderHook(() => useImageRetry());

    // Exhaust all retries: 0→1, 1→2, then hasError
    act(() => result.current.handleError());
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.retryCount).toBe(1);

    act(() => result.current.handleError());
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.retryCount).toBe(2);

    act(() => result.current.handleError());
    expect(result.current.hasError).toBe(true);
  });
});
