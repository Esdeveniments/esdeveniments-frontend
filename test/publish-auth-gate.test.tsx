import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), locale: "ca" }));
vi.mock("@components/hooks/useAuth", () => ({ useAuth: () => ({ signIn: mocks.signIn }) }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }));
vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations: () => (key: string) => key,
}));

vi.mock("@i18n/routing", () => ({
  getPathname: ({ href, locale }: { href: string; locale: string }) => locale === "ca" ? href : `/${locale}${href}`,
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@heroicons/react/24/outline", () => ({
  PencilSquareIcon: () => <svg data-testid="pencil-icon" />,
}));

import PublishAuthGate from "@app/[locale]/publica/PublishAuthGate";

describe("PublishAuthGate", () => {
  beforeEach(() => {
    mocks.signIn.mockClear();
    mocks.locale = "ca";
    window.history.replaceState(null, "", "/publica");
  });
  it.each(["ca", "es", "en"])("keeps %s and resume intent through a second login", (locale) => {
    mocks.locale = locale;
    window.history.replaceState(null, "", "/publica?resume=1");
    render(<PublishAuthGate />);
    fireEvent.click(screen.getByRole("button", { name: "login" }));
    expect(mocks.signIn).toHaveBeenCalledWith(`${locale === "ca" ? "" : `/${locale}`}/publica?resume=1`);
  });
  it("keeps ordinary manual visits as ordinary sign-in returns", () => {
    render(<PublishAuthGate />);
    fireEvent.click(screen.getByRole("button", { name: "login" }));
    expect(mocks.signIn).toHaveBeenCalledWith("/publica");
  });

  it("offers a register link that also returns to /publica", () => {
    render(<PublishAuthGate />);
    const registerLink = screen
      .getAllByRole("link")
      .find((a) => a.getAttribute("href")?.startsWith("/registre"));
    expect(registerLink?.getAttribute("href")).toBe(
      "/registre?redirect=%2Fpublica"
    );
  });
});
