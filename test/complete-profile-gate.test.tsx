import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@i18n/routing", () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@heroicons/react/24/outline", () => ({
  UserCircleIcon: () => <svg data-testid="user-circle-icon" />,
}));

import CompleteProfileGate from "@app/[locale]/publica/CompleteProfileGate";

describe("CompleteProfileGate", () => {
  it("links to /perfil/edita with the given redirect target", () => {
    render(<CompleteProfileGate redirectTo="/publica" />);
    const link = screen.getByRole("link", { name: "cta" });
    expect(link.getAttribute("href")).toBe(
      "/perfil/edita?redirect=%2Fpublica",
    );
  });
});
