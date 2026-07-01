import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@i18n/routing", () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@heroicons/react/24/outline", () => ({
  PencilSquareIcon: () => <svg data-testid="pencil-icon" />,
}));

import PublishAuthGate from "@app/[locale]/publica/PublishAuthGate";

describe("PublishAuthGate", () => {
  it("links sign-in back to /publica via the redirect param", () => {
    render(<PublishAuthGate />);
    const loginLink = screen
      .getAllByRole("link")
      .find((a) => a.getAttribute("href")?.startsWith("/iniciar-sessio"));
    expect(loginLink?.getAttribute("href")).toBe(
      "/iniciar-sessio?redirect=%2Fpublica"
    );
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
