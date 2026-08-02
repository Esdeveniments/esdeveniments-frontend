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

  it("fires auth_success once when the URL carries the one-shot marker", () => {
    searchParamsMock = new URLSearchParams("auth_success=1");
    render(<AuthEventTracker />);

    expect(sendGoogleEventMock).toHaveBeenCalledWith("auth_success", {});
  });

  it("fires auth_failure with the reason when the URL carries auth_error", () => {
    searchParamsMock = new URLSearchParams("auth_error=denied");
    render(<AuthEventTracker />);

    expect(sendGoogleEventMock).toHaveBeenCalledWith("auth_failure", {
      reason: "denied",
    });
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
