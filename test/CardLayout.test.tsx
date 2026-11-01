import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CardLayout from "@components/ui/common/cardContent/CardLayout";

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
});
