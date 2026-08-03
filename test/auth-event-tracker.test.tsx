import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";

const { sendGoogleEventMock } = vi.hoisted(() => ({
  sendGoogleEventMock: vi.fn<
    (event: string, obj: Record<string, unknown>) => void
  >(),
}));

let searchParamsMock = new URLSearchParams();

vi.mock("@utils/analytics", () => ({
  sendGoogleEvent: sendGoogleEventMock,
  ensureGtag: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsMock,
}));

import AuthEventTracker from "@components/analytics/AuthEventTracker";

describe("AuthEventTracker", () => {
  beforeEach(() => {
    sendGoogleEventMock.mockReset();
    searchParamsMock = new URLSearchParams();
  });

  it("fires auth_gate_click with the action from a clicked data-analytics-action element", () => {
    render(
      <div>
        <AuthEventTracker />
        <button type="button" data-analytics-action="publish_gate_login">
          Login
        </button>
      </div>,
    );

    fireEvent.click(document.querySelector("button")!);

    expect(sendGoogleEventMock).toHaveBeenCalledTimes(1);
    expect(sendGoogleEventMock).toHaveBeenCalledWith("auth_gate_click", {
      action: "publish_gate_login",
    });
  });

  it("ignores clicks on elements without data-analytics-action", () => {
    render(
      <div>
        <AuthEventTracker />
        <button type="button">Not tracked</button>
      </div>,
    );

    fireEvent.click(document.querySelector("button")!);

    expect(sendGoogleEventMock).not.toHaveBeenCalled();
  });

  it("attributes a click on a nested icon to the ancestor's data-analytics-action", () => {
    render(
      <div>
        <AuthEventTracker />
        <button type="button" data-analytics-action="navbar_login_mobile_icon">
          <span data-testid="icon">icon</span>
        </button>
      </div>,
    );

    fireEvent.click(document.querySelector('[data-testid="icon"]')!);

    expect(sendGoogleEventMock).toHaveBeenCalledWith("auth_gate_click", {
      action: "navbar_login_mobile_icon",
    });
  });

  it("fires auth_success once and strips the marker from the URL, keeping other params", () => {
    window.history.pushState({}, "", "/en?auth_success=1&other=1");
    searchParamsMock = new URLSearchParams("auth_success=1&other=1");
    render(<AuthEventTracker />);

    expect(sendGoogleEventMock).toHaveBeenCalledTimes(1);
    expect(sendGoogleEventMock).toHaveBeenCalledWith("auth_success", {});
    expect(window.location.search).toBe("?other=1");
  });

  it("fires auth_failure with the reason once and strips auth_error from the URL", () => {
    window.history.pushState({}, "", "/en?auth_error=denied");
    searchParamsMock = new URLSearchParams("auth_error=denied");
    render(<AuthEventTracker />);

    expect(sendGoogleEventMock).toHaveBeenCalledTimes(1);
    expect(sendGoogleEventMock).toHaveBeenCalledWith("auth_failure", {
      reason: "denied",
    });
    expect(window.location.search).toBe("");
  });

  it("fires neither auth_success nor auth_failure when no marker is present", () => {
    render(<AuthEventTracker />);

    expect(sendGoogleEventMock).not.toHaveBeenCalledWith(
      "auth_success",
      expect.anything(),
    );
    expect(sendGoogleEventMock).not.toHaveBeenCalledWith(
      "auth_failure",
      expect.anything(),
    );
  });
});
