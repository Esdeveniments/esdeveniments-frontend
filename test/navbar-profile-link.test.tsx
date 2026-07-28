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
  openMenu: "Obre el menú",
  closeMenu: "Tanca el menú",
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
    fireEvent.click(screen.getByLabelText(labels.openMenu));

    const links = screen.getAllByText("El meu perfil");
    for (const link of links) {
      expect(link.closest("a")?.getAttribute("href")).toBe("/perfil/edita");
    }
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
    fireEvent.click(screen.getByLabelText(labels.openMenu));

    const links = screen.getAllByText("El meu perfil");
    for (const link of links) {
      expect(link.closest("a")?.getAttribute("href")).toBe("/perfil/alba");
    }
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
    fireEvent.click(screen.getByLabelText(labels.openMenu));

    const links = screen.getAllByText("El meu perfil");
    for (const link of links) {
      expect(link.closest("a")?.getAttribute("href")).toBe("/perfil/alba");
    }
  });
});
