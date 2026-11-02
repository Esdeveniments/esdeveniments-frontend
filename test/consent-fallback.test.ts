import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { TcfData } from "types/ads";

vi.mock("@lib/context/AdContext", () => ({
  useAdContext: () => ({ adsAllowed: false }),
}));

import { armConsentFallback } from "app/GoogleScripts";

// Fake CMP that answers addEventListener with the given TCF events, in order.
function installCmp(events: TcfData[]) {
  window.__tcfapi = (command, _version, callback) => {
    if (command !== "addEventListener") return;
    for (const event of events) callback({ ...event, listenerId: 1 }, true);
  };
  const showRevocationMessage = vi.fn();
  window.googlefc = { showRevocationMessage };
  return showRevocationMessage;
}

describe("armConsentFallback", () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.useRealTimers();
    window.__tcfapi = undefined;
    window.googlefc = undefined;
  });

  it("shows the box when FC reports no consent and shows nothing", () => {
    const show = installCmp([{ gdprApplies: true }]);
    armConsentFallback();
    vi.advanceTimersByTime(3000);
    expect(show).toHaveBeenCalledTimes(1);
  });

  it("does not show the box again to a visitor who already chose", () => {
    const show = installCmp([
      { eventStatus: "tcloaded", gdprApplies: true, tcString: "CQ..." },
    ]);
    armConsentFallback();
    vi.advanceTimersByTime(3000);
    expect(show).not.toHaveBeenCalled();
  });

  it("does not open a second box when FC shows its own", () => {
    const show = installCmp([
      { gdprApplies: true },
      { eventStatus: "cmpuishown", gdprApplies: true },
    ]);
    armConsentFallback();
    vi.advanceTimersByTime(3000);
    expect(show).not.toHaveBeenCalled();
  });
});
