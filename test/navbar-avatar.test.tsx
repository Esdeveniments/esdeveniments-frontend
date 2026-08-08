import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";
import type { AuthUser } from "types/auth";
import type { NavbarLabels } from "types/props";

const authUser: AuthUser = {
  id: "ff3da805-08f2-4fd0-acd5-6372344aa339",
  email: "a@b.com",
  name: "A",
  username: "alba",
  avatarUrl: "https://res.cloudinary.com/example/avatars/alba.webp",
  profileCompleted: true,
};

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
  default: ({ children, href, ...props }: { children: ReactNode; href: string } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@components/ui/common/navbar/LanguageSwitcher", () => ({
  default: () => null,
}));

vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({
    user: authUser,
    isAuthenticated: true,
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

describe("NavbarClient avatar", () => {
  it("keeps the logo at its aspect ratio and uses the compact layout below the nav breakpoint", () => {
    render(<NavbarClient navigation={[]} labels={labels} />);
    const logo = screen.getByAltText(labels.logoAlt);
    const navbar = document.getElementById("site-navbar");

    expect(logo).toHaveClass("!h-auto", "aspect-[190/18]");
    expect(navbar).toHaveClass("nav:sticky");
    expect(screen.getByTestId("compact-navbar-actions")).toHaveClass("nav:hidden");
    expect(screen.getByTestId("desktop-navbar-actions")).toHaveClass("hidden", "nav:flex");
    expect(screen.getByTestId("mobile-bottom-nav")).toHaveClass("nav:hidden");

    const mobileAvatar = screen.getByTestId("mobile-avatar-link");
    expect(mobileAvatar).not.toHaveClass("text-primary", "border-b-2", "border-primary");
  });

  it("gives a transparent-background upload a neutral backdrop instead of the fallback button color", () => {
    render(<NavbarClient navigation={[]} labels={labels} />);
    const img = screen.getByTestId("user-avatar-button").querySelector("img");
    expect(img).toHaveAttribute("src", authUser.avatarUrl);
    expect(img).toHaveClass("bg-background");
  });

  it("gives the avatar toggle a visible focus ring, matching every other nav control", () => {
    render(<NavbarClient navigation={[]} labels={labels} />);
    const button = screen.getByTestId("user-avatar-button");
    expect(button).toHaveClass("focus-visible:ring-2", "focus-visible:ring-primary");
  });
});
