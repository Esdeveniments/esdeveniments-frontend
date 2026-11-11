import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NativeShareButton from "@components/ui/common/nativeShareButton";

const mockSendGoogleEvent = vi.fn();
vi.mock("@utils/analytics", () => ({
  sendGoogleEvent: (...args: unknown[]) => mockSendGoogleEvent(...args),
  getShareItemId: () => "my-event",
}));
vi.mock("@components/hooks/useCheckMobileScreen", () => ({ default: () => true }));

describe("NativeShareButton", () => {
  const originalShare = navigator.share;

  beforeEach(() => mockSendGoogleEvent.mockClear());
  afterEach(() => {
    Object.defineProperty(navigator, "share", { value: originalShare, configurable: true });
  });

  const tapShare = async (error: DOMException) => {
    Object.defineProperty(navigator, "share", {
      value: vi.fn().mockRejectedValue(error),
      configurable: true,
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <NativeShareButton
        title="Concert"
        url="https://www.esdeveniments.cat/e/my-event"
        date="dissabte, 28 de febrer"
        location="Cardedeu"
        subLocation="Vallès Oriental"
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
  };

  it("does not report a closed share sheet as an error", async () => {
    await tapShare(new DOMException("closed", "AbortError"));
    expect(mockSendGoogleEvent).not.toHaveBeenCalled();
  });

  it("reports a real share failure", async () => {
    await tapShare(new DOMException("blocked", "NotAllowedError"));
    expect(mockSendGoogleEvent).toHaveBeenCalledWith(
      "share_error",
      expect.objectContaining({ method: "native" }),
    );
  });

  it("shares a localized date and place, without an empty place part", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    render(
      <NativeShareButton
        title="Concert"
        url="https://www.esdeveniments.cat/e/my-event"
        date="dissabte, 28 de febrer"
        location="Cardedeu"
        subLocation=""
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Comparteix Concert" }));
    });
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Concert\n\nData: dissabte, 28 de febrer\nLloc: Cardedeu",
      }),
    );
  });
});
