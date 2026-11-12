import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Link from "next/link";
import { SWRConfig } from "swr";

const fetchMock = vi.fn<
  (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => Promise<{ ok: boolean; status: number; json?: () => Promise<unknown> }>
>();

const refreshMock = vi.fn<() => void>();

const sendGoogleEventMock = vi.fn<
  (event: string, obj: Record<string, unknown>) => void
>();

vi.mock("@i18n/routing", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@utils/analytics", () => ({
  sendGoogleEvent: sendGoogleEventMock,
}));

const isAuthenticatedMock = vi.fn(() => false);
vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: isAuthenticatedMock() }),
}));

describe("FavoriteButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAuthenticatedMock.mockReturnValue(false);
    (globalThis as unknown as { fetch?: unknown }).fetch = fetchMock;
    // Simulate being on the /preferits page so router.refresh() is triggered
    Object.defineProperty(window, "location", {
      value: { pathname: "/preferits" },
      writable: true,
    });
  });

  it("renders with correct aria state and toggles on click", async () => {
    fetchMock
      // Initial hydration: GET /api/favorites
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, favorites: [] }),
      })
      // Toggle: POST /api/favorites
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, favorites: ["test-event"] }),
      });

    const { default: FavoriteButton } = await import(
      "@components/ui/common/favoriteButton"
    );

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <FavoriteButton
          eventSlug="test-event"
          initialIsFavorite={false}
          labels={{ add: "Afegeix a preferits", remove: "Elimina de preferits" }}
        />
      </SWRConfig>
    );

    const button = screen.getByRole("button", { name: "Afegeix a preferits" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button.querySelector("use")).toHaveAttribute("href", "#icon-heart-outline");

    fireEvent.click(button);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/favorites",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });

    expect(screen.getByRole("button", { name: "Elimina de preferits" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(button.querySelector("use")).toHaveAttribute("href", "#icon-heart-solid");
  });

  it("adopts the saved favorites list once it loads", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, favorites: ["test-event"] }),
    });

    const { default: FavoriteButton } = await import(
      "@components/ui/common/favoriteButton"
    );

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <FavoriteButton
          eventSlug="test-event"
          initialIsFavorite={false}
          labels={{ add: "Afegeix a preferits", remove: "Elimina de preferits" }}
        />
      </SWRConfig>
    );

    expect(
      await screen.findByRole("button", { name: "Elimina de preferits" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("beats only when a tap fills the heart, not on mount or list sync", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, favorites: ["test-event", "other-event"] }),
      })
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });

    const { default: FavoriteButton } = await import(
      "@components/ui/common/favoriteButton"
    );

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <FavoriteButton
          eventSlug="test-event"
          initialIsFavorite={true}
          labels={{ add: "Afegeix a preferits", remove: "Elimina de preferits" }}
        />
        <FavoriteButton
          eventSlug="other-event"
          initialIsFavorite={false}
          labels={{ add: "Afegeix a preferits", remove: "Elimina de preferits" }}
        />
      </SWRConfig>
    );

    // Saved on mount (first) and saved once the shared list loads (second).
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Elimina de preferits" })).toHaveLength(2);
    });
    for (const heart of document.querySelectorAll("svg")) {
      expect(heart).not.toHaveClass("animate-heartBeat");
    }

    const [button] = screen.getAllByRole("button", { name: "Elimina de preferits" });
    const heart = button.querySelector("svg")!;
    fireEvent.click(button);
    expect(heart).not.toHaveClass("animate-heartBeat");

    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    expect(heart).toHaveClass("animate-heartBeat");

    // jsdom has no AnimationEvent, so React listens for the prefixed name.
    fireEvent(heart, new Event("webkitAnimationEnd", { bubbles: true }));
    expect(heart).not.toHaveClass("animate-heartBeat");
  });

  it("rolls back optimistic state when server action fails", async () => {
    fetchMock
      // Initial hydration: GET /api/favorites
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, favorites: [] }),
      })
      // Toggle: POST /api/favorites
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

    const { default: FavoriteButton } = await import(
      "@components/ui/common/favoriteButton"
    );

    const parentClick = vi.fn();

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <Link href="/e/test-event" onClick={parentClick}>
          <FavoriteButton
            eventSlug="test-event"
            initialIsFavorite={false}
            labels={{ add: "Afegeix a preferits", remove: "Elimina de preferits" }}
          />
        </Link>
      </SWRConfig>
    );

    const button = screen.getByRole("button", { name: "Afegeix a preferits" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/favorites",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Afegeix a preferits" })).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    });

    expect(parentClick).not.toHaveBeenCalled();
  });

  it("shows a friendly message when MAX_FAVORITES_REACHED and rolls back", async () => {
    fetchMock
      // Initial hydration: GET /api/favorites
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, favorites: [] }),
      })
      // Toggle: POST /api/favorites
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          ok: false,
          error: "MAX_FAVORITES_REACHED",
          maxFavorites: 10,
        }),
      });

    const { default: FavoriteButton } = await import(
      "@components/ui/common/favoriteButton"
    );

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <FavoriteButton
          eventSlug="test-event"
          initialIsFavorite={false}
          labels={{ add: "Afegeix a preferits", remove: "Elimina de preferits" }}
        />
      </SWRConfig>
    );

    const button = screen.getByRole("button", { name: "Afegeix a preferits" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/favorites",
        expect.objectContaining({ method: "POST" })
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Afegeix a preferits" })).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    });

    expect(sendGoogleEventMock).toHaveBeenCalledWith(
      "favorites_limit_reached",
      expect.objectContaining({
        action: "add",
        max_favorites: 10,
        event_slug: "test-event",
      })
    );

    expect(
      screen.getByText(/Has arribat al límit de 10 preferits/i)
    ).toBeInTheDocument();
  });

  it("blocks adding past the authenticated soft limit without calling the API", async () => {
    isAuthenticatedMock.mockReturnValue(true);

    const manyFavorites = Array.from({ length: 50 }, (_, i) => `event-${i}`);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, favorites: manyFavorites }),
    });

    const { default: FavoriteButton } = await import(
      "@components/ui/common/favoriteButton"
    );

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <FavoriteButton
          eventSlug="new-event"
          eventId="new-event-id"
          initialIsFavorite={false}
          labels={{ add: "Afegeix a preferits", remove: "Elimina de preferits" }}
        />
      </SWRConfig>
    );

    const button = await screen.findByRole("button", { name: "Afegeix a preferits" });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1); // only the GET hydration call
    });

    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(/Has arribat al límit de 50 preferits/i)
      ).toBeInTheDocument();
    });

    // No POST fired — blocked client-side before the network call.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(button).toHaveAttribute("aria-pressed", "false");
  });
});
