import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import type { AuthUser } from "types/auth";
import type { NavbarLabels } from "types/props";

const OWNER_ID = "ff3da805-08f2-4fd0-acd5-6372344aa339";

let authUser: AuthUser | null = null;

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@i18n/routing", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@components/ui/common/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@components/ui/primitives/PressableLink", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@components/ui/common/navbar/LanguageSwitcher", () => ({
  default: () => null,
}));

vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({
    user: authUser,
    isAuthenticated: !!authUser,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

import NavbarClient from "@components/ui/common/navbar/NavbarClient";

const labels: NavbarLabels = {
  logoAlt: "Esdeveniments",
  home: "Inici",
  agenda: "Agenda",
  favorites: "Preferits",
  publish: "Publica",
  news: "Notícies",
  mobilePublishLabel: "Publica",
  login: "Inicia sessió",
  logout: "Tanca sessió",
  userMenu: "Menú d'usuari",
  myProfile: "El meu perfil",
  incompleteProfile: "Sessió incompleta",
};

describe("NavbarClient profile link", () => {
  beforeEach(() => {
    authUser = null;
  });

  it("links to /perfil/edita when the profile isn't completed yet", () => {
    authUser = {
      id: OWNER_ID,
      email: "a@b.com",
      name: "A",
      username: "user-4b34dd41",
      profileCompleted: false,
    };
    render(<NavbarClient navigation={[]} labels={labels} />);
    fireEvent.click(screen.getByTestId("user-avatar-button"));

    expect(
      screen.getByText("El meu perfil").closest("a")?.getAttribute("href")
    ).toBe("/perfil/edita");
    expect(
      screen.getByTestId("mobile-avatar-link").getAttribute("href")
    ).toBe("/perfil/edita");
  });

  it("links to /perfil/{username} once the profile is completed", () => {
    authUser = {
      id: OWNER_ID,
      email: "a@b.com",
      name: "A",
      username: "alba",
      profileCompleted: true,
    };
    render(<NavbarClient navigation={[]} labels={labels} />);
    fireEvent.click(screen.getByTestId("user-avatar-button"));

    expect(
      screen.getByText("El meu perfil").closest("a")?.getAttribute("href")
    ).toBe("/perfil/alba");
    expect(
      screen.getByTestId("mobile-avatar-link").getAttribute("href")
    ).toBe("/perfil/alba");
  });

  it("links to /perfil/{username} when profileCompleted is undefined (transient enrichment blip)", () => {
    authUser = {
      id: OWNER_ID,
      email: "a@b.com",
      name: "A",
      username: "alba",
      profileCompleted: undefined,
    };
    render(<NavbarClient navigation={[]} labels={labels} />);
    fireEvent.click(screen.getByTestId("user-avatar-button"));

    expect(
      screen.getByText("El meu perfil").closest("a")?.getAttribute("href")
    ).toBe("/perfil/alba");
    expect(
      screen.getByTestId("mobile-avatar-link").getAttribute("href")
    ).toBe("/perfil/alba");
  });

  it("falls back to the re-auth link on mobile when the session is only partially enriched", () => {
    authUser = {
      id: OWNER_ID,
      email: "a@b.com",
      name: "A",
      username: "alba",
      profileCompleted: true,
      profileEnrichmentFailed: "auth",
    };
    render(<NavbarClient navigation={[]} labels={labels} />);

    expect(
      screen.getByTestId("mobile-login-link").getAttribute("href")
    ).toBe("/iniciar-sessio");
    expect(screen.queryByTestId("mobile-avatar-link")).toBeNull();
  });

  it("shows the mobile login link, not the avatar, when signed out", () => {
    authUser = null;
    render(<NavbarClient navigation={[]} labels={labels} />);

    expect(
      screen.getByTestId("mobile-login-link").getAttribute("href")
    ).toBe("/iniciar-sessio");
    expect(screen.queryByTestId("mobile-avatar-link")).toBeNull();
    expect(screen.queryByTestId("user-avatar-button")).toBeNull();
  });
});

describe("NavbarClient bottom bar Favoritos", () => {
  beforeEach(() => {
    authUser = null;
  });

  it("always links to /preferits, signed in or out", () => {
    authUser = null;
    const { unmount } = render(<NavbarClient navigation={[]} labels={labels} />);
    expect(
      screen.getByLabelText(labels.favorites).getAttribute("href")
    ).toBe("/preferits");
    unmount();

    authUser = {
      id: OWNER_ID,
      email: "a@b.com",
      name: "A",
      username: "alba",
      profileCompleted: true,
    };
    render(<NavbarClient navigation={[]} labels={labels} />);
    expect(
      screen.getByLabelText(labels.favorites).getAttribute("href")
    ).toBe("/preferits");
  });
});
