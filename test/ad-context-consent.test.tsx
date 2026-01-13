/**
 * Tests for AdContext consent detection logic.
 *
 * These tests ensure the polling mechanism correctly handles:
 * - CMP (Consent Management Platform) already available on mount
 * - CMP loading after mount but before 5s timeout
 * - CMP loading after 5s fallback (consent revocation still detected)
 * - CMP never loading (15s timeout)
 * - Consent granted vs denied
 * - Consent revocation after initial grant
 * - Component unmount cleanup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, screen } from "@testing-library/react";
import { AdProvider, useAdContext } from "@lib/context/AdContext";
import type { TcfData } from "types/ads";

// Test component that exposes the context value
function TestConsumer() {
  const { adsAllowed } = useAdContext();
  return <div data-testid="ads-allowed">{adsAllowed ? "true" : "false"}</div>;
}

// Helper to create mock TCF data
function createTcfData(
  eventStatus: "tcloaded" | "useractioncomplete",
  consent: boolean,
  listenerId?: number
): TcfData {
  return {
    eventStatus,
    listenerId,
    purpose: { consents: { "1": consent } },
    vendor: { consents: { "755": consent } },
  };
}

describe("AdContext consent detection", () => {
  let originalTcfApi: typeof window.__tcfapi;
  let originalAdsConsentGranted: boolean | undefined;
  let tcfListeners: Map<number, (tcData: TcfData, success: boolean) => void>;
  let nextListenerId: number;

  beforeEach(() => {
    vi.useFakeTimers();
    originalTcfApi = window.__tcfapi;
    originalAdsConsentGranted = window.__adsConsentGranted;
    tcfListeners = new Map();
    nextListenerId = 1;
    // Reset global state
    delete window.__tcfapi;
    delete window.__adsConsentGranted;
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.__tcfapi = originalTcfApi;
    window.__adsConsentGranted = originalAdsConsentGranted;
  });

  // Helper to install mock CMP
  function installMockCmp(initialConsent: boolean) {
    window.__tcfapi = vi.fn(
      (
        command: string,
        _version: number,
        callback: (tcData: TcfData, success: boolean) => void,
        listenerId?: number
      ) => {
        if (command === "getTCData") {
          // Immediately invoke with current consent state
          callback(createTcfData("tcloaded", initialConsent), true);
        } else if (command === "addEventListener") {
          const id = nextListenerId++;
          tcfListeners.set(id, callback);
          // Return listenerId in the callback
          callback(createTcfData("tcloaded", initialConsent, id), true);
        } else if (command === "removeEventListener" && listenerId) {
          tcfListeners.delete(listenerId);
        }
      }
    );
  }

  // Helper to simulate user consent change in CMP
  function simulateConsentChange(consent: boolean) {
    tcfListeners.forEach((callback) => {
      callback(createTcfData("useractioncomplete", consent), true);
    });
  }

  describe("CMP available on mount", () => {
    it("should set adsAllowed=true when consent is granted", () => {
      installMockCmp(true);

      render(
        <AdProvider>
          <TestConsumer />
        </AdProvider>
      );

      expect(screen.getByTestId("ads-allowed").textContent).toBe("true");
      expect(window.__adsConsentGranted).toBe(true);
    });

    it("should set adsAllowed=false when consent is denied", () => {
      installMockCmp(false);

      render(
        <AdProvider>
          <TestConsumer />
        </AdProvider>
      );

      expect(screen.getByTestId("ads-allowed").textContent).toBe("false");
      expect(window.__adsConsentGranted).toBe(false);
    });

    it("should register both getTCData and addEventListener", () => {
      installMockCmp(true);

      render(
        <AdProvider>
          <TestConsumer />
        </AdProvider>
      );

      expect(window.__tcfapi).toHaveBeenCalledWith(
        "getTCData",
        2,
        expect.any(Function)
      );
      expect(window.__tcfapi).toHaveBeenCalledWith(
        "addEventListener",
        2,
        expect.any(Function)
      );
    });
  });

  describe("CMP loads after mount but before 5s timeout", () => {
    it("should detect CMP via polling and register listeners", () => {
      // Start without CMP
      render(
        <AdProvider>
          <TestConsumer />
        </AdProvider>
      );

      // Initially adsAllowed should be false (default state)
      expect(screen.getByTestId("ads-allowed").textContent).toBe("false");

      // Advance 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Install CMP with consent
      installMockCmp(true);

      // Advance past next poll interval (250ms)
      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(screen.getByTestId("ads-allowed").textContent).toBe("true");
      expect(window.__tcfapi).toHaveBeenCalled();
    });

    it("should correctly handle denied consent when CMP loads late", () => {
      render(
        <AdProvider>
          <TestConsumer />
        </AdProvider>
      );

      // Advance 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Install CMP with denied consent
      installMockCmp(false);

      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(screen.getByTestId("ads-allowed").textContent).toBe("false");
    });
  });

  describe("5-second fallback with continued polling", () => {
    it("should enable ads after 5s if CMP not loaded, but continue polling", () => {
      render(
        <AdProvider>
          <TestConsumer />
        </AdProvider>
      );

      // Initially false
      expect(screen.getByTestId("ads-allowed").textContent).toBe("false");

      // Advance to just before 5s - still no consent
      act(() => {
        vi.advanceTimersByTime(4900);
      });
      expect(screen.getByTestId("ads-allowed").textContent).toBe("false");

      // Advance past 5s (20 polls * 250ms = 5000ms) - fallback should trigger
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(screen.getByTestId("ads-allowed").textContent).toBe("true");
      expect(window.__adsConsentGranted).toBe(true);
    });

    it("should detect CMP after fallback and handle consent revocation", () => {
      render(
        <AdProvider>
          <TestConsumer />
        </AdProvider>
      );

      // Advance past 5s - fallback triggers, ads enabled
      act(() => {
        vi.advanceTimersByTime(5100);
      });

      expect(screen.getByTestId("ads-allowed").textContent).toBe("true");

      // CMP loads at 7s with DENIED consent
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      installMockCmp(false);

      // Next poll detects CMP
      act(() => {
        vi.advanceTimersByTime(250);
      });

      // Should revoke consent!
      expect(screen.getByTestId("ads-allowed").textContent).toBe("false");
      expect(window.__adsConsentGranted).toBe(false);
    });
  });

  describe("consent revocation", () => {
    it("should update adsAllowed when user revokes consent via CMP", () => {
      installMockCmp(true);

      render(
        <AdProvider>
          <TestConsumer />
        </AdProvider>
      );

      // Initially granted
      expect(screen.getByTestId("ads-allowed").textContent).toBe("true");

      // User revokes consent via CMP banner
      act(() => {
        simulateConsentChange(false);
      });

      expect(screen.getByTestId("ads-allowed").textContent).toBe("false");
      expect(window.__adsConsentGranted).toBe(false);
    });

    it("should update adsAllowed when user grants consent after initial denial", () => {
      installMockCmp(false);

      render(
        <AdProvider>
          <TestConsumer />
        </AdProvider>
      );

      // Initially denied
      expect(screen.getByTestId("ads-allowed").textContent).toBe("false");

      // User grants consent
      act(() => {
        simulateConsentChange(true);
      });

      expect(screen.getByTestId("ads-allowed").textContent).toBe("true");
    });

    it("should not trigger unnecessary updates for same consent value", () => {
      installMockCmp(true);
      const dispatchSpy = vi.spyOn(window, "dispatchEvent");

      render(
        <AdProvider>
          <TestConsumer />
        </AdProvider>
      );

      expect(screen.getByTestId("ads-allowed").textContent).toBe("true");

      const initialDispatchCount = dispatchSpy.mock.calls.filter(
        (call) => (call[0] as CustomEvent).type === "ads-consent-changed"
      ).length;

      // Simulate same consent value again
      act(() => {
        simulateConsentChange(true);
      });

      // Should not dispatch another event
      const finalDispatchCount = dispatchSpy.mock.calls.filter(
        (call) => (call[0] as CustomEvent).type === "ads-consent-changed"
      ).length;

      expect(finalDispatchCount).toBe(initialDispatchCount);
    });
  });

  describe("15-second total timeout", () => {
    it("should stop polling after 15 seconds", () => {
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      render(
        <AdProvider>
          <TestConsumer />
        </AdProvider>
      );

      // Advance past 15s (60 polls * 250ms = 15000ms)
      act(() => {
        vi.advanceTimersByTime(15100);
      });

      // clearInterval should have been called to stop polling
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe("cleanup on unmount", () => {
    it("should clear polling interval on unmount", () => {
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      const { unmount } = render(
        <AdProvider>
          <TestConsumer />
        </AdProvider>
      );

      // Advance a bit to ensure polling started
      act(() => {
        vi.advanceTimersByTime(500);
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it("should remove TCF event listener on unmount", () => {
      installMockCmp(true);

      const { unmount } = render(
        <AdProvider>
          <TestConsumer />
        </AdProvider>
      );

      expect(screen.getByTestId("ads-allowed").textContent).toBe("true");

      unmount();

      expect(window.__tcfapi).toHaveBeenCalledWith(
        "removeEventListener",
        2,
        expect.any(Function),
        expect.any(Number)
      );
    });

    it("should not update state after unmount", () => {
      installMockCmp(true);
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { unmount } = render(
        <AdProvider>
          <TestConsumer />
        </AdProvider>
      );

      expect(screen.getByTestId("ads-allowed").textContent).toBe("true");

      unmount();

      // Simulate consent change after unmount
      act(() => {
        simulateConsentChange(false);
      });

      // Should not cause any React warnings about state updates on unmounted components
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("unmounted")
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("should handle TCF callback with success=false", () => {
      window.__tcfapi = vi.fn(
        (
          command: string,
          _version: number,
          callback: (tcData: TcfData | null, success: boolean) => void
        ) => {
          if (command === "getTCData" || command === "addEventListener") {
            callback(null, false);
          }
        }
      );

      render(
        <AdProvider>
          <TestConsumer />
        </AdProvider>
      );

      // CMP is present but returns failure - should fall back after 5s
      // But since CMP IS defined, polling won't start, so it won't fallback
      // Actually, the CMP callback failing means consent is not set
      // Let's verify it stays false
      expect(screen.getByTestId("ads-allowed").textContent).toBe("false");
    });

    it("should handle TCF callback with invalid eventStatus", () => {
      window.__tcfapi = vi.fn(
        (
          command: string,
          _version: number,
          callback: (tcData: TcfData, success: boolean) => void
        ) => {
          if (command === "getTCData" || command === "addEventListener") {
            callback(
              {
                eventStatus: "cmpuishown" as TcfData["eventStatus"], // Not tcloaded or useractioncomplete
                purpose: { consents: { "1": true } },
                vendor: { consents: { "755": true } },
              },
              true
            );
          }
        }
      );

      render(
        <AdProvider>
          <TestConsumer />
        </AdProvider>
      );

      // Should not set consent from invalid eventStatus
      expect(screen.getByTestId("ads-allowed").textContent).toBe("false");
    });

    it("should handle missing purpose consent (only vendor)", () => {
      window.__tcfapi = vi.fn(
        (
          command: string,
          _version: number,
          callback: (tcData: TcfData, success: boolean) => void
        ) => {
          if (command === "getTCData" || command === "addEventListener") {
            callback(
              {
                eventStatus: "tcloaded",
                purpose: { consents: {} }, // No purpose consent
                vendor: { consents: { "755": true } },
              },
              true
            );
          }
        }
      );

      render(
        <AdProvider>
          <TestConsumer />
        </AdProvider>
      );

      // Should be false because purpose[1] is missing
      expect(screen.getByTestId("ads-allowed").textContent).toBe("false");
    });

    it("should handle missing vendor consent (only purpose)", () => {
      window.__tcfapi = vi.fn(
        (
          command: string,
          _version: number,
          callback: (tcData: TcfData, success: boolean) => void
        ) => {
          if (command === "getTCData" || command === "addEventListener") {
            callback(
              {
                eventStatus: "tcloaded",
                purpose: { consents: { "1": true } },
                vendor: { consents: {} }, // No vendor 755
              },
              true
            );
          }
        }
      );

      render(
        <AdProvider>
          <TestConsumer />
        </AdProvider>
      );

      // Should be false because vendor[755] is missing
      expect(screen.getByTestId("ads-allowed").textContent).toBe("false");
    });
  });
});
