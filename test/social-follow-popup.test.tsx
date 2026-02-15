/**
 * Unit Tests for SocialFollowPopup
 *
 * Tests cover:
 * - Page-view counting and pathname deduplication
 * - shouldShow guard logic (cooldown, max dismissals)
 * - Trigger conditions (timer OR scroll)
 * - Dismiss behavior (localStorage persistence, Escape key)
 * - Desktop vs mobile rendering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import SocialFollowPopup, {
  STORAGE_KEY,
  PAGE_VIEW_KEY,
  DELAY_MS,
  COOLDOWN_DAYS,
  MAX_DISMISSALS,
} from "@components/ui/common/social/SocialFollowPopup";

// ── Mocks ───────────────────────────────────────────────────────────
vi.mock("@components/hooks/useCheckMobileScreen", () => ({
  default: vi.fn(() => false), // desktop by default
}));

// ── Helpers ─────────────────────────────────────────────────────────
function clearStorage() {
  localStorage.clear();
  sessionStorage.clear();
}

/** Seed sessionStorage so MIN_PAGE_VIEWS is already met. */
function seedPageViews(count: number, lastPath = "/page-a") {
  sessionStorage.setItem(PAGE_VIEW_KEY, String(count));
  sessionStorage.setItem(PAGE_VIEW_KEY + "-path", lastPath);
}

function setPopupState(dismissCount: number, lastDismissedAt: number) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ dismissCount, lastDismissedAt }),
  );
}

function getPopupState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setScrollableDocument(docHeight: number, viewportHeight: number) {
  Object.defineProperty(document.body, "scrollHeight", {
    value: docHeight,
    configurable: true,
  });
  Object.defineProperty(document.documentElement, "scrollHeight", {
    value: docHeight,
    configurable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    value: viewportHeight,
    configurable: true,
  });
}

// ── Setup ───────────────────────────────────────────────────────────
beforeEach(() => {
  clearStorage();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  // Default: enough scrollable area (3000px doc, 800px viewport)
  setScrollableDocument(3000, 800);
  // Reset scrollY
  Object.defineProperty(window, "scrollY", {
    value: 0,
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// =====================================================================
// 1. PAGE VIEW COUNTING
// =====================================================================
describe("SocialFollowPopup – page view counting", () => {
  it("should not show on first page view (count = 1)", () => {
    render(<SocialFollowPopup pathname="/page-a" />);
    act(() => {
      vi.advanceTimersByTime(DELAY_MS + 100);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(sessionStorage.getItem(PAGE_VIEW_KEY)).toBe("1");
  });

  it("should increment page views on pathname change", () => {
    const { rerender } = render(<SocialFollowPopup pathname="/page-a" />);
    expect(sessionStorage.getItem(PAGE_VIEW_KEY)).toBe("1");

    rerender(<SocialFollowPopup pathname="/page-b" />);
    expect(sessionStorage.getItem(PAGE_VIEW_KEY)).toBe("2");
  });

  it("should deduplicate same pathname (Strict Mode resilience)", () => {
    const { rerender } = render(<SocialFollowPopup pathname="/page-a" />);
    expect(sessionStorage.getItem(PAGE_VIEW_KEY)).toBe("1");

    // Same pathname again (simulates Strict Mode double-invocation)
    rerender(<SocialFollowPopup pathname="/page-a" />);
    expect(sessionStorage.getItem(PAGE_VIEW_KEY)).toBe("1");
  });

  it("should count revisiting a previous pathname", () => {
    const { rerender } = render(<SocialFollowPopup pathname="/page-a" />);
    rerender(<SocialFollowPopup pathname="/page-b" />);
    rerender(<SocialFollowPopup pathname="/page-a" />);
    expect(sessionStorage.getItem(PAGE_VIEW_KEY)).toBe("3");
  });
});

// =====================================================================
// 2. TRIGGER CONDITIONS (OR logic)
// =====================================================================
describe("SocialFollowPopup – trigger conditions", () => {
  it("should show after timer fires (no scroll needed)", () => {
    // Seed 1 view so the 2nd render meets MIN_PAGE_VIEWS
    seedPageViews(1, "/other");

    render(<SocialFollowPopup pathname="/page-b" />);

    // Timer fires → popup should appear
    act(() => {
      vi.advanceTimersByTime(DELAY_MS + 100);
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should show after scroll passes threshold (no timer needed)", () => {
    seedPageViews(1, "/other");

    render(<SocialFollowPopup pathname="/page-b" />);

    // Scroll past 35% of scrollable area: (3000 - 800) * 0.35 = 770
    Object.defineProperty(window, "scrollY", { value: 800, configurable: true });
    act(() => {
      fireEvent.scroll(document);
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should not show if scroll is below threshold", () => {
    seedPageViews(1, "/other");

    render(<SocialFollowPopup pathname="/page-b" />);

    // Scroll only 200px — below 770 threshold
    Object.defineProperty(window, "scrollY", { value: 200, configurable: true });
    act(() => {
      fireEvent.scroll(document);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should not show before timer fires and without scroll", () => {
    seedPageViews(1, "/other");

    render(<SocialFollowPopup pathname="/page-b" />);

    // Advance only 5s — not enough
    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// =====================================================================
// 3. shouldShow GUARD LOGIC
// =====================================================================
describe("SocialFollowPopup – shouldShow guards", () => {
  it("should show for brand new users (no localStorage state)", () => {
    seedPageViews(1, "/other");

    render(<SocialFollowPopup pathname="/page-b" />);
    act(() => {
      vi.advanceTimersByTime(DELAY_MS + 100);
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should not show if MAX_DISMISSALS reached", () => {
    setPopupState(MAX_DISMISSALS, Date.now());
    seedPageViews(1, "/other");

    render(<SocialFollowPopup pathname="/page-b" />);
    act(() => {
      vi.advanceTimersByTime(DELAY_MS + 100);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should not show during cooldown period", () => {
    // Dismissed 5 days ago — still within 30-day cooldown
    const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
    setPopupState(1, fiveDaysAgo);
    seedPageViews(1, "/other");

    render(<SocialFollowPopup pathname="/page-b" />);
    act(() => {
      vi.advanceTimersByTime(DELAY_MS + 100);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should show again after cooldown expires", () => {
    // Dismissed 31 days ago — cooldown passed
    const thirtyOneDaysAgo =
      Date.now() - (COOLDOWN_DAYS + 1) * 24 * 60 * 60 * 1000;
    setPopupState(1, thirtyOneDaysAgo);
    seedPageViews(1, "/other");

    render(<SocialFollowPopup pathname="/page-b" />);
    act(() => {
      vi.advanceTimersByTime(DELAY_MS + 100);
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

// =====================================================================
// 4. DISMISS BEHAVIOR
// =====================================================================
describe("SocialFollowPopup – dismiss", () => {
  function showPopup() {
    seedPageViews(1, "/other");
    render(<SocialFollowPopup pathname="/page-b" />);
    act(() => {
      vi.advanceTimersByTime(DELAY_MS + 100);
    });
  }

  it("should dismiss and save state when close button clicked", () => {
    showPopup();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const closeButtons = screen.getAllByRole("button", {
      name: /ara no/i,
    });
    fireEvent.click(closeButtons[0]);

    // Wait for the 300ms animation timeout
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const state = getPopupState();
    expect(state).not.toBeNull();
    expect(state.dismissCount).toBe(1);
    expect(state.lastDismissedAt).toBeGreaterThan(0);
  });

  it("should dismiss on Escape key", () => {
    showPopup();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should dismiss when backdrop is clicked", () => {
    showPopup();

    const backdrop = document.querySelector("[aria-hidden='true']");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should increment dismissCount on each dismiss", () => {
    // First dismiss
    setPopupState(0, 0);
    showPopup();
    fireEvent.keyDown(document, { key: "Escape" });
    act(() => {
      vi.advanceTimersByTime(400);
    });

    const state = getPopupState();
    expect(state.dismissCount).toBe(1);
  });
});

// =====================================================================
// 5. MOBILE VS DESKTOP RENDERING
// =====================================================================
describe("SocialFollowPopup – mobile vs desktop", () => {
  it("should render as dialog (role=dialog) on desktop", () => {
    seedPageViews(1, "/other");

    render(<SocialFollowPopup pathname="/page-b" />);
    act(() => {
      vi.advanceTimersByTime(DELAY_MS + 100);
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should render as complementary (role=complementary) on mobile", async () => {
    const mod = await import("@components/hooks/useCheckMobileScreen");
    (mod.default as ReturnType<typeof vi.fn>).mockReturnValue(true);

    seedPageViews(1, "/other");

    render(<SocialFollowPopup pathname="/page-b" />);
    act(() => {
      vi.advanceTimersByTime(DELAY_MS + 100);
    });

    expect(screen.getByRole("complementary")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Restore
    (mod.default as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });
});

// =====================================================================
// 6. SOCIAL LINKS
// =====================================================================
describe("SocialFollowPopup – social links", () => {
  it("should render all 8 social platform links", () => {
    seedPageViews(1, "/other");

    render(<SocialFollowPopup pathname="/page-b" />);
    act(() => {
      vi.advanceTimersByTime(DELAY_MS + 100);
    });

    const platforms = [
      "Instagram",
      "X",
      "Facebook",
      "Threads",
      "LinkedIn",
      "Telegram",
      "TikTok",
      "Mastodon",
    ];

    for (const label of platforms) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it("should open social links in new tab", () => {
    seedPageViews(1, "/other");

    render(<SocialFollowPopup pathname="/page-b" />);
    act(() => {
      vi.advanceTimersByTime(DELAY_MS + 100);
    });

    const link = screen.getByLabelText("Instagram");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

// =====================================================================
// 7. EDGE CASES
// =====================================================================
describe("SocialFollowPopup – edge cases", () => {
  it("should not trigger twice after already shown", () => {
    seedPageViews(1, "/other");
    const { rerender } = render(<SocialFollowPopup pathname="/page-b" />);

    // Timer fires → popup shown
    act(() => {
      vi.advanceTimersByTime(DELAY_MS + 100);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Dismiss
    fireEvent.keyDown(document, { key: "Escape" });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Navigate to another page — should NOT re-trigger (hasTriggeredRef)
    rerender(<SocialFollowPopup pathname="/page-c" />);
    act(() => {
      vi.advanceTimersByTime(DELAY_MS + 100);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should clean up timer and scroll listener on unmount", () => {
    seedPageViews(1, "/other");
    const removeListenerSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = render(<SocialFollowPopup pathname="/page-b" />);
    unmount();

    expect(removeListenerSpy).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );
    removeListenerSpy.mockRestore();
  });
});
