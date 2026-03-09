import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScrollVisibility } from "components/hooks/useScrollVisibility";

describe("useScrollVisibility", () => {
  beforeEach(() => {
    // Provide a mock for requestAnimationFrame that fires synchronously
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(performance.now());
      return 0;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when scrollY is below threshold", () => {
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
    const { result } = renderHook(() => useScrollVisibility(100));

    expect(result.current).toBe(true);
  });

  it("returns false when scrollY is above threshold", () => {
    Object.defineProperty(window, "scrollY", { value: 200, writable: true });
    const { result } = renderHook(() => useScrollVisibility(100));

    expect(result.current).toBe(false);
  });

  it("updates on scroll events", () => {
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
    const { result } = renderHook(() => useScrollVisibility(100));

    expect(result.current).toBe(true);

    // Scroll past threshold
    Object.defineProperty(window, "scrollY", { value: 150, writable: true });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current).toBe(false);
  });

  it("boundary: exactly at threshold returns false", () => {
    Object.defineProperty(window, "scrollY", { value: 100, writable: true });
    const { result } = renderHook(() => useScrollVisibility(100));

    expect(result.current).toBe(false);
  });

  it("boundary: one pixel below threshold returns true", () => {
    Object.defineProperty(window, "scrollY", { value: 99, writable: true });
    const { result } = renderHook(() => useScrollVisibility(100));

    expect(result.current).toBe(true);
  });

  it("scrolling back up makes it visible again", () => {
    Object.defineProperty(window, "scrollY", { value: 200, writable: true });
    const { result } = renderHook(() => useScrollVisibility(100));

    expect(result.current).toBe(false);

    Object.defineProperty(window, "scrollY", { value: 50, writable: true });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current).toBe(true);
  });
});
