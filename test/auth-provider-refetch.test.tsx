import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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

  it("does not hang forever on a stalled refetch — resolves once the abort timeout fires", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            user: { id: "u1", email: "a@b.com", name: "A", username: "first" },
          }),
      } as Response)
      .mockImplementationOnce((_url, init) => {
        const signal = (init as RequestInit)?.signal;
        return new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
        });
      });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    // Hydration settles with real timers first, so its own fetch/json/state
    // microtask chain doesn't get tangled up with fake-timer advancement.
    await waitFor(() =>
      expect(screen.getByTestId("username")).toHaveTextContent("first"),
    );

    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole("button", { name: "refetch" }));
      await act(() => vi.advanceTimersByTimeAsync(0));
      // Stalled fetch hasn't resolved yet — still the pre-refetch value.
      expect(screen.getByTestId("username")).toHaveTextContent("first");

      // Past the 10s abort timeout: the stalled fetch's signal fires, load()
      // resolves with null instead of hanging forever.
      await act(() => vi.advanceTimersByTimeAsync(10_000));
      expect(screen.getByTestId("username")).toHaveTextContent("none");
    } finally {
      vi.useRealTimers();
    }
  });
});
