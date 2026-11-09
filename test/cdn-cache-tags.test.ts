import { afterEach, describe, expect, it } from "vitest";
import {
  buildEventCdnTags,
  buildPageCdnTags,
  getCdnHost,
} from "@lib/cdn/cache-tags";
import type { EventCdnScope } from "types/cdn";

const HOST = "www.esdeveniments.cat";

function event(overrides: EventCdnScope = {}): EventCdnScope {
  return {
    slug: "concert-girona",
    city: { slug: "girona" },
    region: { slug: "girones" },
    province: { slug: "girona" },
    owner: { username: "anna" },
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

  it("tags festa major hubs with their place, so event purges reach them", () => {
    expect(
      buildPageCdnTags(HOST, ["festa-major", "malgrat-de-mar"], false),
    ).toEqual([`${HOST}:html`, `${HOST}:place:malgrat-de-mar`]);
  });

  it("tags the Catalonia-wide hubs like /catalunya", () => {
    for (const first of ["festes-majors", "fires-de-nadal"]) {
      expect(buildPageCdnTags(HOST, [first], false)).toEqual([
        `${HOST}:html`,
        `${HOST}:place:catalunya`,
      ]);
    }
  });

  it("tags the home page", () => {
    expect(buildPageCdnTags(HOST, [], false)).toEqual([`${HOST}:html`, `${HOST}:home`]);
  });

  it("only adds the html tag to other public pages", () => {
    expect(buildPageCdnTags(HOST, ["noticies"], false)).toEqual([`${HOST}:html`]);
    expect(buildPageCdnTags(HOST, ["e", "slug", "extra"], false)).toEqual([`${HOST}:html`]);
  });

  it("sends no tags without a host", () => {
    expect(buildPageCdnTags("", ["barcelona"], true)).toEqual([]);
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
      city: { slug: "figueres" },
      region: { slug: "alt-emporda" },
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

describe("getCdnHost", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it("namespaces tags by the configured site host, so staging never purges production", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://Staging.Esdeveniments.cat:8443/";

    expect(getCdnHost()).toBe("staging.esdeveniments.cat");
  });

  it("returns no host for an unusable site URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "not a url";

    expect(getCdnHost()).toBe("");
  });
});
