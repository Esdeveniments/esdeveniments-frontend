import type { CategorySummaryResponseDTO } from "types/api/category";
import type { PlaceTypeAndLabel } from "types/common";
import type { FaqItem } from "types/faq";
import type { DateContext, ListPageFaqParams } from "types/props";
import { capitalizeFirstLetter, formatCatalanA } from "@utils/helpers";

const DATE_CONTEXT: Record<string, DateContext> = {
  avui: { inline: "avui", capitalized: "Avui" },
  dema: { inline: "demà", capitalized: "Demà" },
  setmana: { inline: "aquesta setmana", capitalized: "Aquesta setmana" },
  "cap-de-setmana": {
    inline: "aquest cap de setmana",
    capitalized: "Aquest cap de setmana",
  },
};

const DEFAULT_DATE_CONTEXT: DateContext = {
  inline: "els propers dies",
  capitalized: "Els propers dies",
};

function getDateContext(date?: string): DateContext {
  if (!date) return DEFAULT_DATE_CONTEXT;
  return DATE_CONTEXT[date] ?? DEFAULT_DATE_CONTEXT;
}

function getScopePhrase(
  place: string,
  placeTypeLabel?: PlaceTypeAndLabel
): string {
  if (placeTypeLabel?.label) {
    return formatCatalanA(
      placeTypeLabel.label,
      placeTypeLabel.type ?? "general",
      false
    );
  }

  if (place === "catalunya" || !place) {
    return "a Catalunya";
  }

  return formatCatalanA(place, "general", false);
}

function composeContext(...parts: (string | undefined)[]): string {
  return parts
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveCategoryName(
  category?: string,
  categories?: CategorySummaryResponseDTO[]
): string | undefined {
  if (!category || category === "tots") return undefined;
  const match = categories?.find((cat) => cat.slug === category);
  if (match?.name) return match.name;
  return capitalizeFirstLetter(category.replace(/-/g, " "));
}


export function buildListPageFaqItems({
  place,
  date,
  category,
  placeTypeLabel,
  categories,
}: ListPageFaqParams): FaqItem[] {
  const dateContext = getDateContext(date);
  const scopePhrase = getScopePhrase(place, placeTypeLabel);
  const contextInline = composeContext(dateContext.inline, scopePhrase);
  const capitalizedContext = capitalizeFirstLetter(
    composeContext(dateContext.capitalized, scopePhrase)
  );
  const categoryName = resolveCategoryName(category, categories);

  const items: FaqItem[] = [
    {
      q: `Què puc fer ${contextInline}?`,
      a: `${capitalizedContext} hi trobaràs concerts, fires, activitats familiars i propostes culturals actualitzades cada dia.`,
    },
    {
      q: `Hi ha activitats gratuïtes ${contextInline}?`,
      a: `Sí. Pots utilitzar la cerca, els filtres de categoria i la distància per descobrir activitats gratuïtes ${contextInline}.`,
    },
  ];

  if (categoryName) {
    items.push({
      q: `On puc veure ${categoryName.toLowerCase()} ${contextInline}?`,
      a: `Selecciona la categoria "${categoryName}" per destacar aquests esdeveniments ${contextInline} i guarda l'agenda per consultar-la sovint.`,
    });
  }

  return items;
}

