import { describe, expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";
import type { NavbarLabels } from "types/props";

// While Next prerenders the generic shell of a route with params
// (ca/[place].html, ca/e/[eventId].html), usePathname() suspends. The navbar
// must still be in that shell: only each ActiveLink's tiny boundary may wait.
const { suspend } = vi.hoisted(() => ({
  suspend: (): never => {
    throw new Promise(() => {});
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: suspend,
  useParams: suspend,
}));

vi.mock("@i18n/routing", () => ({
  usePathname: suspend,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// The server render: the session isn't known yet.
vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
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
  loginShort: "Entra",
  logout: "Tanca sessió",
  userMenu: "Menú d'usuari",
  myProfile: "El meu perfil",
  incompleteProfile: "Sessió incompleta",
};

describe("navbar in a prerendered shell with unknown params", () => {
  test("renders every link even when the pathname suspends", () => {
    const html = renderToString(
      <NavbarClient
        navigation={[
          { name: "Agenda", href: "/catalunya", current: false },
          { name: "Notícies", href: "/noticies", current: false },
        ]}
        labels={labels}
      />,
    );

    expect(html).toContain('id="site-navbar"');
    expect(html).toContain('href="/catalunya"');
    expect(html).toContain('href="/noticies"');
    expect(html).toContain('href="/preferits"');
    // Links waiting on the pathname fall back to the non-active style.
    expect(html).not.toContain("border-b-2 border-primary");
  });
});
