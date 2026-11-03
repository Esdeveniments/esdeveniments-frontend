import { describe, expect, it } from "vitest";
import { buildEventCdnTags, buildPageCdnTags } from "@lib/cdn/cache-tags";
import type { EventCdnScope } from "types/cdn";

const HOST = "www.esdeveniments.cat";

function event(overrides: EventCdnScope = {}): EventCdnScope {
  return {
    slug: "concert-girona",
    city: { id: 1, name: "Girona", slug: "girona", latitude: 0, longitude: 0, postalCode: "17001", rssFeed: null, enabled: true },
    region: { id: 2, name: "Gironès", slug: "girones" },
    province: { id: 3, name: "Girona", slug: "girona" },
    owner: { id: "u1", displayName: "Anna", username: "anna", avatarUrl: null, verified: false, role: "USER" },
    ...overrides,
  };
}

describe("buildPageCdnTags", () => {
  it("tags the place listing, whatever date or category follows", () => {
    expect(buildPageCdnTags(HOST, ["barcelona", "avui", "musica"], true)).toEqual([
      `${HOST}:html`,
      `${HOST}:place:barcelona`,
    ]);
  });

  it("namespaces tags by host without the port, so staging never purges production", () => {
    expect(buildPageCdnTags("Staging.Esdeveniments.cat:3000", [], false)).toEqual([
      "staging.esdeveniments.cat:html",
      "staging.esdeveniments.cat:home",
    ]);
  });

  it("only adds the html tag to other public pages", () => {
    expect(buildPageCdnTags(HOST, ["noticies"], false)).toEqual([`${HOST}:html`]);
    expect(buildPageCdnTags(HOST, ["e", "slug", "extra"], false)).toEqual([`${HOST}:html`]);
  });

  it("sends no tags without a host", () => {
    expect(buildPageCdnTags(null, ["barcelona"], true)).toEqual([]);
  });

  it("matches the event purge for encoded and unsafe slugs", () => {
    const pageTags = buildPageCdnTags(HOST, ["e", "caf%C3%A9,concert"], false);
    const purgeTags = buildEventCdnTags(HOST, [{ slug: "café,concert" }]);

    expect(pageTags[1]).toMatch(new RegExp(`^${HOST}:event:h-[a-z0-9]+$`));
    expect(purgeTags).toContain(pageTags[1]);
  });

  it("keeps a malformed escape instead of throwing", () => {
    expect(buildPageCdnTags(HOST, ["e", "%E0%A4%A"], false)).toHaveLength(2);
  });
});

describe("buildEventCdnTags", () => {
  it("covers every cached page that can list the event", () => {
    expect(buildEventCdnTags(HOST, [event()])).toEqual([
      `${HOST}:home`,
      `${HOST}:place:catalunya`,
      `${HOST}:place:girona`,
      `${HOST}:place:girones`,
      `${HOST}:event:concert-girona`,
      `${HOST}:user:anna`,
    ]);
  });

  it("purges both the old and the new place and slug on edit", () => {
    const before = event();
    const after = event({
      slug: "concert-figueres",
      city: { ...event().city!, slug: "figueres" },
      region: { id: 4, name: "Alt Empordà", slug: "alt-emporda" },
    });

    const tags = buildEventCdnTags(HOST, [before, after]);

    expect(tags).toEqual(
      expect.arrayContaining([
        `${HOST}:place:girona`,
        `${HOST}:place:girones`,
        `${HOST}:place:figueres`,
        `${HOST}:place:alt-emporda`,
        `${HOST}:event:concert-girona`,
        `${HOST}:event:concert-figueres`,
      ]),
    );
    expect(new Set(tags).size).toBe(tags.length);
  });

  it("skips missing events and sends nothing without a host", () => {
    expect(buildEventCdnTags(HOST, [null, undefined])).toEqual([
      `${HOST}:home`,
      `${HOST}:place:catalunya`,
    ]);
    expect(buildEventCdnTags("", [event()])).toEqual([]);
  });
});
