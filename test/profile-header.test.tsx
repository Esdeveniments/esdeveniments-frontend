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

  it("renders the initial as a decorative avatar when there is no picture", async () => {
    const { container } = await renderHeader(baseProfile);
    const header = screen.getByTestId("profile-header");
    expect(header.querySelector("img")).toBeNull();
    // The h1 names the profile, so the avatar stays out of the a11y tree.
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent("S");
  });

  it("renders the picture through the image proxy, eager, with an empty alt", async () => {
    const profile: ProfileDetailResponseDTO = {
      ...baseProfile,
      pictureUrl: "https://cdn.example.com/avatar.jpg",
    };
    await renderHeader(profile);
    const img = screen.getByTestId("profile-header").querySelector("img");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("loading", "eager");
    expect(img?.getAttribute("src")).toContain(
      encodeURIComponent("https://cdn.example.com/avatar.jpg"),
    );
    expect(img).toHaveClass("bg-background");
  });

  it("never renders a joined date (every migrated account shares one)", async () => {
    await renderHeader({ ...baseProfile, createdAt: "2023-01-15T10:30:00Z" });
    const header = screen.getByTestId("profile-header");
    expect(header).not.toHaveTextContent("Des de");
    expect(header).not.toHaveTextContent("2023");
  });

  it("shows the event count next to the handle only when there are events", async () => {
    await renderHeader({ ...baseProfile, eventCount: 12 });
    expect(screen.getByTestId("profile-stats")).toHaveTextContent(
      "@sala-apolo·12 esdeveniments",
    );
  });

  it("leaves out a zero event count", async () => {
    await renderHeader({ ...baseProfile, eventCount: 0 });
    expect(screen.getByTestId("profile-stats").textContent).toBe("@sala-apolo");
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

  it("does not render a verified badge when verified is absent", async () => {
    await renderHeader(baseProfile);
    expect(screen.queryByRole("img", { name: "Verificat" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Organitzador verificat" }),
    ).not.toBeInTheDocument();
  });

  it("renders the user verified badge when verified is true and role is not ORGANIZATION", async () => {
    const profile: ProfileDetailResponseDTO = { ...baseProfile, verified: true };
    await renderHeader(profile);
    expect(screen.getByRole("img", { name: "Verificat" })).toBeInTheDocument();
  });

  it("renders the organizer verified badge when verified is true and role is ORGANIZATION", async () => {
    const profile: ProfileDetailResponseDTO = {
      ...baseProfile,
      verified: true,
      role: "ORGANIZATION",
    };
    await renderHeader(profile);
    expect(
      screen.getByRole("img", { name: "Organitzador verificat" }),
    ).toBeInTheDocument();
  });
});
