import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { GUEST_FAVORITE_SAVED_EVENT } from "@utils/favorites-events";

const authState = { isAuthenticated: false };

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@i18n/routing", () => ({
  Link: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
  usePathname: () => "/ca",
}));

vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

vi.mock("@heroicons/react/24/outline", () => ({
  XMarkIcon: () => <svg data-testid="x-icon" />,
}));
vi.mock("@heroicons/react/24/solid", () => ({
  HeartIcon: () => <svg data-testid="heart-icon" />,
}));

import FavoriteLoginNudge from "@components/ui/common/favoriteButton/FavoriteLoginNudge";

function fireGuestSave() {
  act(() => {
    window.dispatchEvent(new Event(GUEST_FAVORITE_SAVED_EVENT));
  });
}

describe("FavoriteLoginNudge", () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the toast on the first guest save", () => {
    render(<FavoriteLoginNudge />);
    expect(screen.queryByTestId("favorites-login-nudge")).toBeNull();

    fireGuestSave();
    expect(screen.getByTestId("favorites-login-nudge")).toBeInTheDocument();
  });

  it("does not show twice in the same session", () => {
    const { unmount } = render(<FavoriteLoginNudge />);
    fireGuestSave();
    expect(screen.getByTestId("favorites-login-nudge")).toBeInTheDocument();
    unmount();

    render(<FavoriteLoginNudge />);
    fireGuestSave();
    expect(screen.queryByTestId("favorites-login-nudge")).toBeNull();
  });

  it("auto-hides after the timeout", () => {
    render(<FavoriteLoginNudge />);
    fireGuestSave();
    expect(screen.getByTestId("favorites-login-nudge")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.queryByTestId("favorites-login-nudge")).toBeNull();
  });

  it("never shows for authenticated users", () => {
    authState.isAuthenticated = true;
    render(<FavoriteLoginNudge />);
    fireGuestSave();
    expect(screen.queryByTestId("favorites-login-nudge")).toBeNull();
  });
});
