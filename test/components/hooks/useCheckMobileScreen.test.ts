import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useCheckMobileScreen from "components/hooks/useCheckMobileScreen";

describe("useCheckMobileScreen", () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    Object.defineProperty(window, "innerWidth", {
      value: originalInnerWidth,
      writable: true,
    });
  });

  it("returns false by default (desktop-sized jsdom window)", () => {
    Object.defineProperty(window, "innerWidth", {
      value: 1024,
      writable: true,
    });
    const { result } = renderHook(() => useCheckMobileScreen());

    // Allow the effect debounce to resolve
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(false);
  });

  it("returns true when window width is <= 768 (mobile)", () => {
    Object.defineProperty(window, "innerWidth", { value: 375, writable: true });
    const { result } = renderHook(() => useCheckMobileScreen());

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(true);
  });

  it("accepts initialIsMobile to set starting value", () => {
    const { result } = renderHook(() => useCheckMobileScreen(true));

    // Before effect resolves, returns the initial value
    expect(result.current).toBe(true);
  });

  it("responds to resize events", () => {
    Object.defineProperty(window, "innerWidth", {
      value: 1024,
      writable: true,
    });
    const { result } = renderHook(() => useCheckMobileScreen());

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(false);

    // Simulate resize to mobile
    Object.defineProperty(window, "innerWidth", { value: 500, writable: true });
    act(() => {
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(200); // debounce
    });

    expect(result.current).toBe(true);
  });

  it("boundary: exactly 768px is considered mobile", () => {
    Object.defineProperty(window, "innerWidth", { value: 768, writable: true });
    const { result } = renderHook(() => useCheckMobileScreen());

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(true);
  });

  it("boundary: 769px is not considered mobile", () => {
    Object.defineProperty(window, "innerWidth", { value: 769, writable: true });
    const { result } = renderHook(() => useCheckMobileScreen());

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(false);
  });
});
