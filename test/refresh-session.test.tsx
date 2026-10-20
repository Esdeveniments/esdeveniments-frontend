import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockRefresh = vi.fn();
vi.mock("@i18n/routing", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockRefreshSessionAction = vi.fn();
vi.mock("../app/[locale]/e/[eventId]/promote/actions", () => ({
  refreshSessionAction: () => mockRefreshSessionAction(),
}));

import RefreshSession from "../app/[locale]/e/[eventId]/promote/RefreshSession";

describe("RefreshSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps a fallback if the refreshed page still returns the notice", async () => {
    mockRefreshSessionAction.mockResolvedValue(true);

    const { rerender } = render(<RefreshSession>expired</RefreshSession>);

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledOnce());
    rerender(<RefreshSession>expired</RefreshSession>);
    expect(await screen.findByText("expired")).toBeInTheDocument();
    expect(mockRefreshSessionAction).toHaveBeenCalledOnce();
  });

  it("shows progress instead of an empty page while refresh is pending", () => {
    mockRefreshSessionAction.mockReturnValue(new Promise(() => {}));
    render(<RefreshSession>expired</RefreshSession>);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows its fallback when the refresh fails", async () => {
    mockRefreshSessionAction.mockResolvedValue(false);

    render(<RefreshSession>expired</RefreshSession>);

    expect(await screen.findByText("expired")).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("shows its fallback instead of an unhandled rejection", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRefreshSessionAction.mockRejectedValue(new Error("network"));

    render(<RefreshSession>expired</RefreshSession>);

    expect(await screen.findByText("expired")).toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
