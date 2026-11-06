import { describe, expect, it } from "vitest";
import { buildNewsEventsItemListSchema } from "@components/noticies/newsArticleSchema";
import { siteUrl } from "@config/index";

describe("buildNewsEventsItemListSchema", () => {
  const url = `${siteUrl}/es/noticies/barcelona/cap-de-setmana`;

  it("lists the article's events in order with localized event URLs", () => {
    const schema = buildNewsEventsItemListSchema({
      events: [
        { slug: "concert-ginesta", title: 'Concert "Ginestà"' },
        { slug: "", title: "Sense enllaç" },
        { slug: "les-coses-excepcionals", title: "Les coses excepcionals" },
      ],
      name: "Què fer el cap de setmana",
      url,
      locale: "es",
    });

    expect(schema).toMatchObject({
      "@type": "ItemList",
      "@id": `${url}#events`,
      numberOfItems: 2,
      itemListElement: [
        { position: 1, url: `${siteUrl}/es/e/concert-ginesta` },
        { position: 2, url: `${siteUrl}/es/e/les-coses-excepcionals` },
      ],
    });
    expect(JSON.stringify(schema)).not.toContain('"Event"');
  });

  it("returns null without events", () => {
    expect(
      buildNewsEventsItemListSchema({ events: [], name: "x", url, locale: "ca" }),
    ).toBeNull();
  });
});
