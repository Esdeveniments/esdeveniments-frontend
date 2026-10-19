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

  it("re-renders the page once the session is refreshed", async () => {
    mockRefreshSessionAction.mockResolvedValue(true);

    render(<RefreshSession>expired</RefreshSession>);

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledOnce());
    expect(screen.queryByText("expired")).not.toBeInTheDocument();
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
