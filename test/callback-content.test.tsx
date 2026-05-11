import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CallbackContent from "../app/[locale]/callback/CallbackContent";

const { useSearchParamsMock } = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: useSearchParamsMock,
}));

describe("CallbackContent", () => {
  beforeEach(() => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("code=auth-code&state=oauth-state"),
    );
    Object.defineProperty(window, "opener", {
      configurable: true,
      value: null,
    });
  });

  it("posts OAuth callback data only to the callback origin", async () => {
    const postMessage = vi.fn();
    const close = vi.spyOn(window, "close").mockImplementation(() => undefined);

    Object.defineProperty(window, "opener", {
      configurable: true,
      value: { postMessage },
    });

    render(<CallbackContent />);

    await waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith(
        { type: "tiktok-auth", code: "auth-code", state: "oauth-state" },
        window.location.origin,
      );
    });
    expect(postMessage.mock.calls[0]?.[1]).not.toBe("*");
    expect(close).toHaveBeenCalled();

    close.mockRestore();
  });
});