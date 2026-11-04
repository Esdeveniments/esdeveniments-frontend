import { describe, it, expect } from "vitest";
import { buildProfileTabItems } from "@components/partials/profile-tabs";
import type { UserPublicResponseDTO } from "types/api/user";
import type { ProfileTranslator } from "types/props";

const baseProfile: UserPublicResponseDTO = {
  id: "uuid-1",
  username: "sala apolo",
};

const stubTranslator = ((key: string) =>
  key === "tabUpcoming" ? "Propers" : "Passats") as ProfileTranslator;

describe("buildProfileTabItems", () => {
  it("builds upcoming and past tabs with encoded hrefs and translated labels", () => {
    const items = buildProfileTabItems(baseProfile, stubTranslator);

    expect(items).toEqual([
      {
        id: "upcoming",
        href: "/perfil/sala%20apolo",
        label: "Propers",
        count: undefined,
      },
      {
        id: "past",
        href: "/perfil/sala%20apolo/passats",
        label: "Passats",
        count: undefined,
      },
    ]);
  });

  it("passes through upcomingEventCount/pastEventCount when present", () => {
    const items = buildProfileTabItems(
      { ...baseProfile, upcomingEventCount: 3, pastEventCount: 12 },
      stubTranslator,
    );

    expect(items[0].count).toBe(3);
    expect(items[1].count).toBe(12);
  });
});
