import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CardLayout from "@components/ui/common/cardContent/CardLayout";
import IconSprite, { SPRITE_ICON } from "@components/ui/common/IconSprite";

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

function renderCard(isFavorite = false) {
  return renderToStaticMarkup(
    <CardLayout
      slug="concert-de-nadal"
      eventId="42"
      title="Concert de Nadal"
      originalTitle="Concert de Nadal"
      image="https://example.com/image.jpg"
      isPriority={false}
      cardDate="Dissabte, 20 de desembre"
      timeDisplay="18:00"
      primaryLocation="Cardedeu"
      shouldShowFavoriteButton
      isFavorite={isFavorite}
      favoriteLabels={{ add: "Afegeix", remove: "Treu" }}
      renderLink={({ children, ...props }) => <a {...props}>{children}</a>}
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

describe("CardLayout row variant", () => {
  it("numbers the title and shows the excerpt beside a 40% image", () => {
    const html = renderToStaticMarkup(
      <CardLayout
        slug="concert-ginesta"
        variant="row"
        position={4}
        description="Ginestà s'ha consolidat com un dels grups imprescindibles del pop català…"
        title={'Concert "Ginestà"'}
        originalTitle={'Concert "Ginestà"'}
        image=""
        isPriority={false}
        cardDate="7 de novembre"
        timeDisplay="21:00"
        primaryLocation="Razzmatazz (Sant Martí), Barcelona"
        renderLink={({ children, ...props }) => <a {...props}>{children}</a>}
      />
    );
    expect(html).toMatch(/<h3[^>]*>4\. Concert &quot;Ginestà&quot;<\/h3>/);
    expect(html).toContain("md:w-2/5");
    expect(html).toContain("line-clamp-3");
    expect(html).toContain("Ginestà s&#x27;ha consolidat");
  });
});
