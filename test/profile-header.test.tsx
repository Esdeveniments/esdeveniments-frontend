import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { ProfileDetailResponseDTO } from "types/api/profile";

// Mock i18n helpers so the component doesn't depend on root-params at runtime.
vi.mock("@utils/i18n-seo", () => ({
  getLocaleSafely: async () => "ca",
  toLocalizedUrl: (path: string) => path,
}));

// Mock the client component ProfileOwnerActions (it uses useAuth/useTranslations).
vi.mock("@components/ui/profile/ProfileOwnerActions", () => ({
  default: () => null,
}));

import ProfileHeader from "components/ui/profile/ProfileHeader";

const baseProfile: ProfileDetailResponseDTO = {
  id: "uuid-1",
  name: "Sala Apolo",
  username: "sala-apolo",
};

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderHeader(profile: ProfileDetailResponseDTO) {
  const Result = await ProfileHeader({ profile });
  return render(Result);
}

describe("ProfileHeader", () => {
  it("renders the profile name and username", async () => {
    await renderHeader(baseProfile);
    expect(screen.getByText("Sala Apolo")).toBeInTheDocument();
    expect(screen.getByText("@sala-apolo")).toBeInTheDocument();
  });

  it("renders the avatar fallback (initial letter) when no pictureUrl", async () => {
    await renderHeader(baseProfile);
    const avatar = screen.getByRole("img", { name: "Sala Apolo" });
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveTextContent("S");
  });

  it("renders an avatar image when pictureUrl is provided", async () => {
    const profile: ProfileDetailResponseDTO = {
      ...baseProfile,
      pictureUrl: "https://cdn.example.com/avatar.jpg",
    };
    await renderHeader(profile);

    const img = screen.getByAltText("Sala Apolo");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://cdn.example.com/avatar.jpg");
    // The fallback div (role="img" with aria-label) should NOT be present
    expect(screen.queryByText("S")).not.toBeInTheDocument();
  });

  it("gives a transparent-background avatar a neutral backdrop", async () => {
    const profile: ProfileDetailResponseDTO = {
      ...baseProfile,
      pictureUrl: "https://cdn.example.com/avatar.jpg",
    };
    await renderHeader(profile);
    expect(screen.getByAltText("Sala Apolo")).toHaveClass("bg-background");
  });

  it("does not render joined date when createdAt is absent", async () => {
    await renderHeader(baseProfile);
    // The profile section should exist but no joined-date paragraph
    const header = screen.getByTestId("profile-header");
    expect(header).toBeInTheDocument();
    // No "Des de" text (the Catalan joinedDate template is "Des de {date}")
    expect(header).not.toHaveTextContent("Des de");
  });

  it("renders joined date when createdAt is provided", async () => {
    const profile: ProfileDetailResponseDTO = {
      ...baseProfile,
      createdAt: "2023-01-15T10:30:00Z",
    };
    await renderHeader(profile);
    // The Catalan joinedDate template is "Des de {date}" where date is
    // formatted by Intl.DateTimeFormat("ca", { month: "long", year: "numeric" })
    // For Jan 2023 that's "gener de 2023"
    const header = screen.getByTestId("profile-header");
    expect(header.textContent).toContain("Des de");
    expect(header.textContent).toContain("2023");
  });

  it("does not render joined date when createdAt is an invalid date string", async () => {
    const profile: ProfileDetailResponseDTO = {
      ...baseProfile,
      createdAt: "not-a-date",
    };
    await renderHeader(profile);
    const header = screen.getByTestId("profile-header");
    expect(header).not.toHaveTextContent("Des de");
  });

  it("renders the bio when present", async () => {
    const profile: ProfileDetailResponseDTO = {
      ...baseProfile,
      bio: "Sala de concerts al Poble Sec.",
    };
    await renderHeader(profile);
    expect(
      screen.getByText("Sala de concerts al Poble Sec."),
    ).toBeInTheDocument();
  });

  it("does not render a bio paragraph when bio is absent", async () => {
    await renderHeader(baseProfile);
    expect(screen.queryByTestId("profile-bio")).not.toBeInTheDocument();
  });

  it("does not render a bio paragraph when bio is blank", async () => {
    const profile: ProfileDetailResponseDTO = { ...baseProfile, bio: "   " };
    await renderHeader(profile);
    expect(screen.queryByTestId("profile-bio")).not.toBeInTheDocument();
  });

  it("caps runs of blank lines so a mostly-newline bio can't blow up the layout", async () => {
    const profile: ProfileDetailResponseDTO = {
      ...baseProfile,
      bio: `Hola${"\n".repeat(200)}Adéu`,
    };
    await renderHeader(profile);
    expect(screen.getByTestId("profile-bio").textContent).toBe("Hola\n\nAdéu");
  });

  it("caps runs of CRLF blank lines too, not just bare \\n", async () => {
    const profile: ProfileDetailResponseDTO = {
      ...baseProfile,
      bio: `Hola${"\r\n".repeat(200)}Adéu`,
    };
    await renderHeader(profile);
    expect(screen.getByTestId("profile-bio").textContent).toBe("Hola\n\nAdéu");
  });

  it("has the correct testid", async () => {
    await renderHeader(baseProfile);
    expect(screen.getByTestId("profile-header")).toBeInTheDocument();
  });
});
