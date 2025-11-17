import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import RestaurantPromotionSection from "../components/ui/restaurantPromotion/RestaurantPromotionSection";

// Mock the child components
vi.mock("../components/ui/restaurantPromotion/WhereToEatSection", () => ({
  default: ({ places }: { places: unknown[] }) => (
    <div data-testid="where-to-eat-section">{places.length} restaurants</div>
  ),
}));

vi.mock("../components/ui/restaurantPromotion/WhereToEatSkeleton", () => ({
  default: () => <div data-testid="loading-skeleton">Loading...</div>,
}));

vi.mock("../components/ui/restaurantPromotion/PromotionInfoModal", () => ({
  default: () => null,
}));

vi.mock("../components/hooks/useOnScreen", () => ({
  default: () => true, // Always visible for testing
}));

// Mock computeTemporalStatus to use mocked time
vi.mock("@utils/event-status", async () => {
  const actual = await vi.importActual<typeof import("@utils/event-status")>(
    "@utils/event-status"
  );
  return {
    ...actual,
    computeTemporalStatus: (
      startDate: string,
      endDate?: string,
      nowOverride?: Date,
      startTime?: string | null,
      endTime?: string | null
    ) => {
      // Use the mocked baseNow if no override is provided
      const baseNow = new Date("2025-11-16T12:00:00.000Z");
      return actual.computeTemporalStatus(
        startDate,
        endDate,
        nowOverride || baseNow,
        startTime,
        endTime
      );
    },
  };
});

// Mock fetch
global.fetch = vi.fn();

describe("RestaurantPromotionSection - Date Logic", () => {
  const baseNow = new Date("2025-11-16T12:00:00.000Z");
  const addDays = (d: number) =>
    new Date(baseNow.getTime() + d * 24 * 60 * 60 * 1000);

  beforeEach(() => {
    vi.clearAllMocks();
    // Use real timers for async operations (fetch, useEffect, waitFor)
    vi.useRealTimers();

    // Mock Date constructor to return baseNow when called without arguments
    // This ensures both computeTemporalStatus and component's direct Date usage work
    // Note: We use manual mocking instead of vi.useFakeTimers() because fake timers
    // don't work well with async operations like waitFor and fetch
    const OriginalDate = global.Date;

    const DateSpy = vi.spyOn(global, "Date").mockImplementation(((
      ...args: unknown[]
    ) => {
      // When called without arguments (new Date()), return mocked time
      if (args.length === 0) {
        return new OriginalDate(baseNow.getTime());
      }
      // Otherwise, use original Date constructor for date parsing

      return new (OriginalDate as any)(...args);
    }) as any);

    // Preserve Date static methods (now, parse, UTC, etc.)
    Object.setPrototypeOf(DateSpy, OriginalDate);
    Object.defineProperty(DateSpy, "now", {
      value: () => baseNow.getTime(),
      writable: true,
      configurable: true,
    });

    // Set up default fetch mock
    global.fetch = vi.fn();
  });

  const defaultProps = {
    eventLat: 41.3851,
    eventLng: 2.1734,
  };

  describe("Event visibility (eventIsInFuture)", () => {
    it("shows component for future events", async () => {
      const startDate = addDays(3).toISOString().split("T")[0]; // 3 days in future
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [],
          status: "OK",
          attribution: "Powered by Google",
        }),
      });
      render(
        <RestaurantPromotionSection
          {...defaultProps}
          eventStartDate={startDate}
        />
      );
      // Component should render (not return null)
      await screen.findByTestId("loading-skeleton");
    });

    it("shows component for events happening today that haven't finished", async () => {
      const today = baseNow.toISOString().split("T")[0]; // Today
      const endTime = "18:00"; // Ends at 6 PM, current time is 12 PM
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [],
          status: "OK",
          attribution: "Powered by Google",
        }),
      });
      render(
        <RestaurantPromotionSection
          {...defaultProps}
          eventStartDate={today}
          eventEndDate={today}
          eventEndTime={endTime}
        />
      );
      await screen.findByTestId("loading-skeleton");
    });

    it("does not show component for events that finished today", () => {
      const today = baseNow.toISOString().split("T")[0];
      const endTime = "10:00"; // Ended at 10 AM, current time is 12 PM
      const { container } = render(
        <RestaurantPromotionSection
          {...defaultProps}
          eventStartDate={today}
          eventEndDate={today}
          eventEndTime={endTime}
        />
      );
      // Component should return null (not render)
      expect(container.firstChild).toBeNull();
    });

    it("does not show component for past events", () => {
      const pastDate = addDays(-2).toISOString().split("T")[0]; // 2 days ago
      const { container } = render(
        <RestaurantPromotionSection
          {...defaultProps}
          eventStartDate={pastDate}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it("shows component for events that started earlier but haven't finished", () => {
      const startDate = addDays(-1).toISOString().split("T")[0]; // Started yesterday
      const endDate = addDays(1).toISOString().split("T")[0]; // Ends tomorrow
      const { container } = render(
        <RestaurantPromotionSection
          {...defaultProps}
          eventStartDate={startDate}
          eventEndDate={endDate}
        />
      );
      // Component should render (event is still ongoing)
      // Note: It won't fetch restaurants (that's tested separately)
      expect(container.firstChild).not.toBeNull();
    });

    it("handles all-day events (no time) happening today", async () => {
      const today = baseNow.toISOString().split("T")[0];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [],
          status: "OK",
          attribution: "Powered by Google",
        }),
      });
      render(
        <RestaurantPromotionSection
          {...defaultProps}
          eventStartDate={today}
          eventStartTime={null}
        />
      );
      await screen.findByTestId("loading-skeleton");
    });
  });

  describe("Fetch window (eventIsWithinFetchWindow)", () => {
    it("fetches restaurants for events starting today", async () => {
      const today = baseNow.toISOString().split("T")[0];
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [],
          status: "OK",
          attribution: "Powered by Google",
        }),
      });
      global.fetch = mockFetch;

      render(
        <RestaurantPromotionSection {...defaultProps} eventStartDate={today} />
      );

      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it("fetches restaurants for events starting within 15 days", async () => {
      const futureDate = addDays(10).toISOString().split("T")[0]; // 10 days ahead
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [],
          status: "OK",
          attribution: "Powered by Google",
        }),
      });
      global.fetch = mockFetch;

      render(
        <RestaurantPromotionSection
          {...defaultProps}
          eventStartDate={futureDate}
        />
      );

      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it("does not fetch for events starting more than 15 days away", async () => {
      const farFutureDate = addDays(20).toISOString().split("T")[0]; // 20 days ahead
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      render(
        <RestaurantPromotionSection
          {...defaultProps}
          eventStartDate={farFutureDate}
        />
      );

      // Wait a bit to ensure fetch is not called
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("does not fetch for events that started in the past (even if still ongoing)", async () => {
      const pastDate = addDays(-2).toISOString().split("T")[0]; // Started 2 days ago
      const endDate = addDays(1).toISOString().split("T")[0]; // Ends tomorrow
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      render(
        <RestaurantPromotionSection
          {...defaultProps}
          eventStartDate={pastDate}
          eventEndDate={endDate}
        />
      );

      // Component should render (event is still ongoing) but not fetch
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("does not fetch for events that have finished", async () => {
      const today = baseNow.toISOString().split("T")[0];
      const endTime = "10:00"; // Ended at 10 AM
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const { container } = render(
        <RestaurantPromotionSection
          {...defaultProps}
          eventStartDate={today}
          eventEndDate={today}
          eventEndTime={endTime}
        />
      );

      // Component should not render at all (event finished) and fetch should not run
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(container.firstChild).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("handles missing eventStartDate gracefully", () => {
      const { container } = render(
        <RestaurantPromotionSection
          {...defaultProps}
          eventStartDate={undefined}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it("handles invalid date strings", () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const { container } = render(
        <RestaurantPromotionSection
          {...defaultProps}
          eventStartDate="invalid-date"
        />
      );
      // Should handle gracefully without crashing
      // Invalid dates may still render (depending on how Date.parse handles them)
      // but should not fetch restaurant data
      expect(container).toBeTruthy();
      // Verify it doesn't crash and doesn't attempt to fetch
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("includes event date in API call when provided", async () => {
      const today = baseNow.toISOString().split("T")[0];
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [],
          status: "OK",
          attribution: "Powered by Google",
        }),
      });
      global.fetch = mockFetch;

      render(
        <RestaurantPromotionSection {...defaultProps} eventStartDate={today} />
      );

      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalled();
          const callUrl = mockFetch.mock.calls[0][0] as string;
          expect(callUrl).toContain(`date=${today}`);
        },
        { timeout: 3000 }
      );
    });
  });
});
