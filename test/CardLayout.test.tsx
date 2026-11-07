import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CardLayout from "@components/ui/common/cardContent/CardLayout";
import IconSprite, { SPRITE_ICON } from "@components/ui/common/IconSprite";
import type { CardData } from "types/props";

vi.mock("@components/ui/common/image", () => ({
  default: () => <span />,
}));

vi.mock("@i18n/routing", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const baseCard: CardData = {
  slug: "concert-de-nadal",
  eventId: "42",
  title: "Concert de Nadal",
  image: "https://example.com/image.jpg",
  cardDate: "Dissabte, 20 de desembre",
  timeDisplay: "18:00",
  primaryLocation: "Cardedeu",
  shouldShowFavoriteButton: true,
  favoriteLabels: { add: "Afegeix", remove: "Treu" },
};

const renderLink: Parameters<typeof CardLayout>[0]["renderLink"] = ({
  children,
  ...props
}) => <a {...props}>{children}</a>;

function renderCard(isFavorite = false) {
  return renderToStaticMarkup(
    <CardLayout
      card={{ ...baseCard, isFavorite }}
      isPriority={false}
      renderLink={renderLink}
    />
  );
}

describe("CardLayout icons", () => {
  it("references the shared sprite instead of inlining icon paths", () => {
    const html = renderCard();
    expect(html).toContain('<use href="#icon-map-pin"></use>');
    expect(html).toContain('<use href="#icon-heart-outline"></use>');
    expect(html).not.toContain("<path");
  });

  it("defines a symbol for every icon the card can reference", () => {
    const sprite = renderToStaticMarkup(<IconSprite />);
    const symbolIds = [...sprite.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]);
    const usedIds = [false, true].flatMap((isFavorite) =>
      [...renderCard(isFavorite).matchAll(/<use href="#([^"]+)"/g)].map((m) => m[1]),
    );

    expect(usedIds).toContain(SPRITE_ICON.heartSolid);

    expect(symbolIds.sort()).toEqual(Object.values(SPRITE_ICON).sort());
    expect(symbolIds).toEqual(expect.arrayContaining(usedIds));
  });
});

describe("CardLayout compact (home carousel)", () => {
  // The classes of the former CardHorizontalServer, so merging it changed nothing visible.
  it("keeps the carousel card's smaller padding, text and icon", () => {
    const html = renderToStaticMarkup(
      <CardLayout card={baseCard} compact isPriority={false} renderLink={renderLink} />
    );
    expect(html).toContain('class="flex-1 flex flex-col px-3.5 pt-2.5 pb-3.5"');
    expect(html).toContain('class="text-xs text-muted-foreground mb-1 truncate"');
    expect(html).toMatch(/<h3 class="order-2 text-sm font-semibold leading-normal line-clamp-2 mb-1\.5 text-foreground-strong[^"]*">/);
    expect(html).not.toContain("min-h-[2.75rem]");
    expect(html).toContain('class="order-3 mt-auto flex items-center gap-1 text-xs text-muted-foreground min-w-0"');
    expect(html).toContain('class="w-3.5 h-3.5 flex-shrink-0"');
  });
});

describe("CardLayout row layout", () => {
  it("numbers the title and shows the excerpt beside a 40% image", () => {
    const html = renderToStaticMarkup(
      <CardLayout
        card={{
          ...baseCard,
          slug: "concert-ginesta",
          title: 'Concert "Ginestà"',
          image: "",
          cardDate: "7 de novembre",
          timeDisplay: "21:00",
          primaryLocation: "Razzmatazz (Sant Martí), Barcelona",
          shouldShowFavoriteButton: false,
        }}
        layout="row"
        position={4}
        description="Ginestà s'ha consolidat com un dels grups imprescindibles del pop català…"
        isPriority={false}
        renderLink={renderLink}
      />
    );
    // The <ol> already gives the order, so the number stays out of the link name.
    expect(html).toMatch(
      /<h3[^>]*><span aria-hidden="true">4\. <\/span><a [^>]*>Concert &quot;Ginestà&quot;<\/a><\/h3>/,
    );
    expect(html).toContain("md:w-2/5");
    expect(html).toContain("card-event-split");
    expect(html).toContain("line-clamp-3");
    expect(html).toContain("Ginestà s&#x27;ha consolidat");
  });
});

describe("CardLayout link", () => {
  it("makes the title the only link, without a duplicate label", () => {
    const html = renderCard();
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toMatch(
      /<h3 class="order-2[^"]*"><a href="\/e\/concert-de-nadal" class="card-event-link"[^>]*>Concert de Nadal<\/a><\/h3>/,
    );
    expect(html).not.toContain("aria-label=\"Concert de Nadal\"");
    expect(html).not.toContain("sr-only");
    expect(html).not.toContain("pointer-events-none");
  });

  it("keeps the analytics attributes on the link", () => {
    const html = renderCard();
    expect(html).toContain('data-analytics-event-name="select_event"');
    expect(html).toContain('data-analytics-event-id="42"');
    expect(html).toContain('data-analytics-event-slug="concert-de-nadal"');
  });

  it("puts the title before the date in the DOM", () => {
    const html = renderCard();
    expect(html.indexOf("Concert de Nadal</a>")).toBeLessThan(
      html.indexOf("Dissabte, 20 de desembre"),
    );
  });

  it("uses the heading level it is given", () => {
    const html = renderToStaticMarkup(
      <CardLayout card={baseCard} headingLevel="h2" isPriority={false} renderLink={renderLink} />
    );
    expect(html).toMatch(/<h2 class="order-2[^"]*"><a /);
    expect(html).not.toContain("<h3");
  });

  it("wraps a single-day date in <time>", () => {
    const html = renderToStaticMarkup(
      <CardLayout
        card={{ ...baseCard, dateTime: "2026-12-20T18:00" }}
        isPriority={false}
        renderLink={renderLink}
      />
    );
    expect(html).toContain('<time dateTime="2026-12-20T18:00">Dissabte, 20 de desembre</time>');
  });
});
