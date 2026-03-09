/**
 * Regression tests for FilterLoadingProvider.
 *
 * 2026-03-07 incident: changing date filter (path segment) while distance/lat/lon
 * query params stayed the same left isLoading stuck at true indefinitely, because
 * the provider only tracked searchParams — not pathname.
 *
 * These tests ensure the loading gate resets on ANY URL change (pathname OR query).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  FilterLoadingProvider,
  useFilterLoading,
} from "../components/context/FilterLoadingContext";

// ---------- mock state for next/navigation ----------
let mockPathname = "/catalunya";
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

// ---------- helper consumer ----------
function LoadingDisplay() {
  const { isLoading, setLoading } = useFilterLoading();
  return (
    <div>
      <span data-testid="loading">{isLoading ? "true" : "false"}</span>
      <button
        data-testid="set-loading"
        onClick={() => setLoading(true)}
      />
    </div>
  );
}

function renderProvider() {
  return render(
    <FilterLoadingProvider>
      <LoadingDisplay />
    </FilterLoadingProvider>,
  );
}

describe("FilterLoadingProvider", () => {
  beforeEach(() => {
    mockPathname = "/catalunya";
    mockSearchParams = new URLSearchParams();
  });

  it("starts with isLoading = false", () => {
    renderProvider();
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("resets loading when searchParams change", () => {
    const { rerender } = renderProvider();

    // Trigger loading
    act(() => screen.getByTestId("set-loading").click());
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    // Simulate searchParams change (e.g. adding distance)
    mockSearchParams = new URLSearchParams("distance=10");
    rerender(
      <FilterLoadingProvider>
        <LoadingDisplay />
      </FilterLoadingProvider>,
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  /**
   * REGRESSION: 2026-03-07
   * Changing date filter changes pathname (/catalunya → /catalunya/avui)
   * but keeps the same query params (distance=10&lat=X&lon=Y).
   * The loading gate must still reset.
   */
  it("resets loading when only pathname changes (query params unchanged)", () => {
    // Start on /catalunya?distance=10&lat=41.385&lon=2.173
    mockPathname = "/catalunya";
    mockSearchParams = new URLSearchParams(
      "distance=10&lat=41.385&lon=2.173",
    );
    const { rerender } = renderProvider();

    // Trigger loading (simulates user clicking "Apply" in filter modal)
    act(() => screen.getByTestId("set-loading").click());
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    // Simulate navigation to /catalunya/avui with SAME query params
    mockPathname = "/catalunya/avui";
    // searchParams stays identical
    rerender(
      <FilterLoadingProvider>
        <LoadingDisplay />
      </FilterLoadingProvider>,
    );

    // Loading must reset even though searchParams didn't change
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("resets loading when both pathname and searchParams change", () => {
    mockPathname = "/catalunya";
    mockSearchParams = new URLSearchParams("distance=10");
    const { rerender } = renderProvider();

    act(() => screen.getByTestId("set-loading").click());
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    mockPathname = "/catalunya/dema";
    mockSearchParams = new URLSearchParams("distance=25");
    rerender(
      <FilterLoadingProvider>
        <LoadingDisplay />
      </FilterLoadingProvider>,
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("does NOT reset loading when URL is unchanged (same pathname + params)", () => {
    mockPathname = "/catalunya";
    mockSearchParams = new URLSearchParams("distance=10");
    const { rerender } = renderProvider();

    act(() => screen.getByTestId("set-loading").click());
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    // Re-render with identical URL — loading should stay true
    rerender(
      <FilterLoadingProvider>
        <LoadingDisplay />
      </FilterLoadingProvider>,
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("true");
  });
});
