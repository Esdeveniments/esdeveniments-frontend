import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthProvider } from "@lib/auth/AuthProvider";
import { useAuth } from "@components/hooks/useAuth";

/**
 * refetchUser() is what lets /perfil/edita and the avatar section update
 * `profileCompleted`/`username`/`avatarUrl` after a successful mutation
 * without a full page reload — the client session is otherwise hydrated
 * once on mount and nothing else keeps it in sync (see AuthProvider.tsx).
 */
function Consumer() {
  const { user, refetchUser } = useAuth();
  return (
    <div>
      <span data-testid="username">{user?.username ?? "none"}</span>
      <button type="button" onClick={() => void refetchUser()}>
        refetch
      </button>
    </div>
  );
}

describe("AuthProvider.refetchUser", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("replaces `user` with the result of a fresh /api/auth/me call", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            user: { id: "u1", email: "a@b.com", name: "A", username: "first" },
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            user: { id: "u1", email: "a@b.com", name: "A", username: "second" },
          }),
      } as Response);

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("username")).toHaveTextContent("first"),
    );

    fireEvent.click(screen.getByRole("button", { name: "refetch" }));

    await waitFor(() =>
      expect(screen.getByTestId("username")).toHaveTextContent("second"),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
