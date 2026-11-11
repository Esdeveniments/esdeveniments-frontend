/**
 * One category label everywhere: the filter chip (FiltersClient),
 * the filters modal and the event cards must show the same text for a slug.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import * as nextIntl from "next-intl";
import * as nextIntlServer from "next-intl/server";
import FiltersClient from "@components/ui/filters/FiltersClient";
import NavigationFiltersModal from "@components/ui/filtersModal/NavigationFiltersModal";
import { prepareCardContentData } from "@components/ui/common/cardContent/prepareCardContentData";
import CardContentClient from "@components/ui/common/cardContent/CardContentClient";
import { CATEGORY_CONFIG } from "@config/categories";
import { renderWithProviders } from "./utils/renderWithProviders";
import type { AppLocale } from "types/i18n";
import type { CardContentProps } from "types/props";
import type { CategorySummaryResponseDTO } from "types/api/category";
import ca from "../messages/ca.json";
import es from "../messages/es.json";
import en from "../messages/en.json";

vi.mock("next/dynamic", () => ({
  default: () => (props: { children?: React.ReactNode }) => (
    <div>{props.children}</div>
  ),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));
vi.mock("@components/hooks/useGetRegionsWithCities", () => ({
  useGetRegionsWithCities: () => ({
    regionsWithCities: [],
    isLoading: false,
    isError: false,
  }),
}));
vi.mock("@utils/analytics", () => ({ sendGoogleEvent: vi.fn() }));
vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

const BACKEND_SLUGS = [
  "literatura",
  "fires-i-mercats",
  "festes-populars",
  "tallers-i-formacio",
  "dansa",
  "salut-i-benestar",
  "esport",
  "patrimoni-cultural",
  "serveis-municipals",
  "gent-gran",
  "familia-i-infants",
  "exposicions",
  "cinema",
  "musica",
  "teatre",
  "altres",
];

const MESSAGES = { ca, es, en } as const;

const EXPECTED: Record<AppLocale, Record<string, string>> = {
  ca: { musica: "Concerts", dansa: "Dansa i ball", teatre: "Teatre" },
  es: { musica: "Conciertos", dansa: "Danza y baile", teatre: "Teatro" },
  en: { musica: "Concerts", dansa: "Dance", teatre: "Theatre" },
};
const UNKNOWN_SLUG = "nova-categoria";
const UNKNOWN_NAME = "Nova categoria";

const backendName = (slug: string) =>
  slug === UNKNOWN_SLUG ? UNKNOWN_NAME : `backend:${slug}`;

const expectedLabel = (locale: AppLocale, slug: string) =>
  EXPECTED[locale][slug] ?? UNKNOWN_NAME;

// The next-intl mock's useTranslations is Catalan-only; route the
// Config.Categories namespace to the locale under test.
async function mockCategoriesLocale(locale: AppLocale) {
  const tCategories = await nextIntlServer.getTranslations({
    locale,
    namespace: "Config.Categories",
  });
  const originalUse = nextIntl.useTranslations;
  vi.spyOn(nextIntl, "useTranslations").mockImplementation(((ns?: string) =>
    ns === "Config.Categories"
      ? tCategories
      : originalUse(ns)) as typeof nextIntl.useTranslations);
  return tCategories;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("category labels", () => {
  it("every backend slug has a Config.Categories label in every locale", () => {
    for (const slug of BACKEND_SLUGS) {
      const labelKey = CATEGORY_CONFIG[slug]?.labelKey;
      expect(labelKey, slug).toBeTruthy();
      for (const messages of Object.values(MESSAGES)) {
        const categories = messages.Config.Categories as Record<string, string>;
        expect(categories[labelKey], `${slug}`).toEqual(expect.any(String));
      }
    }
  });

  describe.each(["ca", "es", "en"] as const)("%s", (locale) => {
    it.each(["musica", "dansa", "teatre", UNKNOWN_SLUG])(
      "chip, modal and card agree for %s",
      async (slug) => {
        const tCategories = await mockCategoriesLocale(locale);
        const category = {
          id: 1,
          slug,
          name: backendName(slug),
        } as CategorySummaryResponseDTO;
        const expected = expectedLabel(locale, slug);

        renderWithProviders(
          <FiltersClient
            segments={{ place: "catalunya", date: "tots", category: slug }}
            queryParams={{}}
            categories={[category]}
            placeTypeLabel={{ type: "", label: "Catalunya" }}
            onOpenModal={vi.fn()}
            labels={{
              triggerLabel: "",
              displayNameMap: {},
              byDates: {},
              prices: { gratis: "Gratuït", pagament: "De pagament" },
            }}
          />,
        );
        expect(screen.getByTestId("filter-pill-category")).toHaveTextContent(
          expected,
        );
        cleanup();

        renderWithProviders(
          <NavigationFiltersModal
            isOpen
            onClose={vi.fn()}
            currentSegments={{ place: "catalunya", date: "tots", category: slug }}
            currentQueryParams={{}}
            userLocation={undefined}
            categories={[category]}
          />,
        );
        expect(document.querySelector(`label[for="${slug}"]`)).toHaveTextContent(
          expected,
        );

        cleanup();

        const event = {
          slug: "event",
          title: "Event",
          startDate: "2026-11-04",
          endDate: "2026-11-04",
          categories: [category],
        } as CardContentProps["event"];

        // Server cards (CardContentServer, including the compact carousel card)
        const serverCard = prepareCardContentData({
          event,
          locale,
          tCard: (key) => key,
          tCategories,
        });
        expect(serverCard.categoryLabel).toBe(expected);

        // Client cards (load more, client filters)
        renderWithProviders(<CardContentClient event={event} />);
        expect(screen.getByText(expected)).toBeInTheDocument();
      },
    );
  });
});
