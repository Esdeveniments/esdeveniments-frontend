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

function renderCard() {
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
      isFavorite={false}
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
    const usedIds = [...renderCard().matchAll(/<use href="#([^"]+)"/g)].map((m) => m[1]);

    expect(symbolIds.sort()).toEqual(Object.values(SPRITE_ICON).sort());
    expect(symbolIds).toEqual(expect.arrayContaining(usedIds));
  });
});
