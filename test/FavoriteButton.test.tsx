import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Link from "next/link";
import type { SVGProps } from "react";

const fetchMock = vi.fn<
  (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => Promise<{ ok: boolean; status: number }>
>();

const refreshMock = vi.fn<() => void>();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
  usePathname: () => "/preferits",
}));

vi.mock("@heroicons/react/solid/esm/HeartIcon", () => ({
  default: (props: SVGProps<SVGSVGElement>) => (
    <svg data-testid="heart-solid" {...props} />
  ),
}));

vi.mock("@heroicons/react/outline/esm/HeartIcon", () => ({
  default: (props: SVGProps<SVGSVGElement>) => (
    <svg data-testid="heart-outline" {...props} />
  ),
}));

describe("FavoriteButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as unknown as { fetch?: unknown }).fetch = fetchMock;
  });

  it("renders with correct aria state and toggles on click", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });

    const { default: FavoriteButton } = await import(
      "@components/ui/common/favoriteButton"
    );

    render(
      <FavoriteButton
        eventSlug="test-event"
        initialIsFavorite={false}
        labels={{ add: "Afegeix a preferits", remove: "Elimina de preferits" }}
      />
    );

    const button = screen.getByRole("button", { name: "Afegeix a preferits" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("heart-outline")).toBeInTheDocument();

    fireEvent.click(button);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/favorites",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    expect(screen.getByRole("button", { name: "Elimina de preferits" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByTestId("heart-solid")).toBeInTheDocument();
  });

  it("rolls back optimistic state when server action fails", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

    const { default: FavoriteButton } = await import(
      "@components/ui/common/favoriteButton"
    );

    const parentClick = vi.fn();

    render(
      <Link href="/e/test-event" onClick={parentClick}>
        <FavoriteButton
          eventSlug="test-event"
          initialIsFavorite={false}
          labels={{ add: "Afegeix a preferits", remove: "Elimina de preferits" }}
        />
      </Link>
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
});
