import { siteUrl } from "@config/index";
import { monthsName } from "@utils/helpers";
import { getPlaceTypeAndLabel } from "@utils/helpers";
import {
  PageData,
  GeneratePagesDataProps,
  PlaceTypeAndLabel,
} from "types/common";
import { formatCatalanA } from "@utils/helpers";

const month = monthsName[new Date().getMonth()];

// Normalize subtitles for LLM/AI SEO extractability:
// - Remove HTML
// - Replace multiple spaces
// - Replace exclamations with periods
// - Limit to at most two sentences
// - Cap length to ~200 chars, cutting at last space
function normalizeSubTitle(input: string): string {
  let s = (input || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return s;
  s = s.replace(/!/g, ".");

  // Limit to two sentences (., ?, !)
  const ends: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "." || ch === "?" || ch === "!") ends.push(i);
    if (ends.length === 2) break;
  }
  if (ends.length === 2) {
    s = s.slice(0, ends[1] + 1);
  }

  // Cap length to 200 chars
  const MAX_LEN = 200;
  if (s.length > MAX_LEN) {
    const cut = s.slice(0, MAX_LEN);
    const lastSpace = cut.lastIndexOf(" ");
    s = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
    if (!/[.!?]$/.test(s)) s += ".";
  }

  return s;
}

// Category-specific SEO templates with cultural context
// Mapped to match backend categories exactly
const CATEGORY_SEO_TEMPLATES = {
  literatura: {
    titleSuffix: "Literatura i llibres",
    description:
      "literatura, llibres, presentacions literàries, clubs de lectura",
    culturalContext: "Descobreix el món de la literatura catalana",
    noEventsText: "activitats literàries",
  },
  "fires-i-mercats": {
    titleSuffix: "Fires i mercats",
    description: "fires, mercats, esdeveniments comercials, artesania",
    culturalContext: "Descobreix fires i mercats tradicionals",
    noEventsText: "fires ni mercats",
  },
  "festes-populars": {
    titleSuffix: "Festes populars",
    description: "festes populars, celebracions tradicionals, cultura popular",
    culturalContext: "Participa en les millors festes populars catalanes",
    noEventsText: "festes populars",
  },
  "tallers-i-formacio": {
    titleSuffix: "Tallers i formació",
    description: "tallers, formació, cursos, aprenentatge",
    culturalContext: "Aprèn i forma't amb els millors tallers",
    noEventsText: "tallers ni formacions",
  },
  dansa: {
    titleSuffix: "Dansa i ball",
    description: "dansa, ball, espectacles de dansa, classes de ball",
    culturalContext: "Viu la passió de la dansa",
    noEventsText: "activitats de dansa",
  },
  "salut-i-benestar": {
    titleSuffix: "Salut i benestar",
    description: "salut, benestar, activitats saludables, wellness",
    culturalContext: "Cuida't amb activitats de salut i benestar",
    noEventsText: "activitats de salut i benestar",
  },
  esport: {
    titleSuffix: "Esport i activitat física",
    description: "esport, activitat física, competicions esportives",
    culturalContext: "Mantén-te actiu amb les millors activitats esportives",
    noEventsText: "activitats esportives",
  },
  "patrimoni-cultural": {
    titleSuffix: "Patrimoni cultural",
    description: "patrimoni cultural, història, monuments, tradicions",
    culturalContext: "Descobreix el ric patrimoni cultural català",
    noEventsText: "activitats de patrimoni cultural",
  },
  "serveis-municipals": {
    titleSuffix: "Serveis municipals",
    description:
      "serveis municipals, administració, tràmits, informació ciutadana",
    culturalContext: "Informa't sobre els serveis municipals disponibles",
    noEventsText: "serveis municipals",
  },
  "gent-gran": {
    titleSuffix: "Activitats per a la gent gran",
    description: "activitats per a gent gran, sèniors, tercera edat",
    culturalContext:
      "Descobreix activitats especialment pensades per a la gent gran",
    noEventsText: "activitats per a la gent gran",
  },
  "familia-i-infants": {
    titleSuffix: "Família i infants",
    description: "activitats familiars, infants, nens, diversió familiar",
    culturalContext: "Diversió per a tota la família",
    noEventsText: "activitats familiars",
  },
  exposicions: {
    titleSuffix: "Exposicions i art",
    description: "exposicions, galeries d'art, museus, art visual",
    culturalContext: "Explora l'art i la cultura visual",
    noEventsText: "exposicions",
  },
  cinema: {
    titleSuffix: "Cinema i audiovisual",
    description: "cinema, projeccions, festivals de cinema, audiovisual",
    culturalContext: "Gaudeix del millor cinema",
    noEventsText: "projeccions de cinema",
  },
  musica: {
    titleSuffix: "Música i concerts",
    description: "música, concerts, espectacles musicals, festivals musicals",
    culturalContext: "Descobreix la millor música en viu",
    noEventsText: "concerts ni espectacles musicals",
  },
  teatre: {
    titleSuffix: "Teatre i arts escèniques",
    description: "teatre, òpera, arts escèniques, espectacles teatrals",
    culturalContext: "Viu les millors obres teatrals",
    noEventsText: "obres de teatre",
  },
  altres: {
    titleSuffix: "Altres activitats",
    description: "altres activitats, esdeveniments diversos, miscel·lània",
    culturalContext: "Descobreix altres activitats interessants",
    noEventsText: "activitats",
  },
};

const createPageData = (
  title: string,
  subTitle: string,
  metaTitle: string,
  metaDescription: string,
  canonical: string,
  notFoundText: string
): PageData => ({
  title,
  subTitle: normalizeSubTitle(subTitle),
  metaTitle,
  metaDescription,
  canonical,
  notFoundText,
});

// Helper function to get category-specific SEO data
function getCategorySEO(categorySlug?: string) {
  if (!categorySlug) return null;
  return (
    CATEGORY_SEO_TEMPLATES[
      categorySlug as keyof typeof CATEGORY_SEO_TEMPLATES
    ] || null
  );
}

export async function generatePagesData({
  currentYear,
  place = "",
  byDate = "",
  placeTypeLabel,
  category,
  categoryName,
}: GeneratePagesDataProps & {
  placeTypeLabel?: PlaceTypeAndLabel;
}): Promise<PageData> {
  if (
    typeof currentYear === "number" &&
    (currentYear < 2000 || currentYear > 3000)
  ) {
    throw new Error("Invalid year range");
  }

  const { type, label }: PlaceTypeAndLabel =
    placeTypeLabel || (await getPlaceTypeAndLabel(place));
  // keep legacy naming compatibility without unused var warnings
  const labelWithArticle = formatCatalanA(label, type, false);

  // Get category-specific SEO data
  const categorySEO = getCategorySEO(category);

  if (!place && !byDate) {
    return createPageData(
      `Què fer a Catalunya. Agenda ${currentYear}`,
      `Agenda cultural de Catalunya aquest ${month}. Selecció actualitzada d’activitats.`,
      `Descobreix esdeveniments a Catalunya aquest ${currentYear}`,
      `Esdeveniments culturals, concerts, exposicions i més a Catalunya.`,
      siteUrl,
      `Ho sentim, però no hi ha esdeveniments a Catalunya. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
    );
  }

  // Category-specific pages with enhanced SEO
  if (category && categorySEO && place) {
    const categoryTitle = categoryName || categorySEO.titleSuffix;
    const baseCanonical = `${siteUrl}/${place}${
      byDate ? `/${byDate}` : ""
    }/${category}`;

    if (byDate === "avui") {
      return createPageData(
        `${categorySEO.titleSuffix} avui ${labelWithArticle}`,
        `${categorySEO.titleSuffix} avui ${labelWithArticle}. Agenda actualitzada.`,
        `${categoryTitle} avui ${labelWithArticle} - Agenda Cultural`,
        `${categoryTitle} avui ${labelWithArticle}. ${categorySEO.description}.`,
        baseCanonical,
        `Ho sentim, però no hi ha ${
          categorySEO.noEventsText || categorySEO.description.split(",")[0]
        } avui ${labelWithArticle}. Descobreix altres opcions culturals que t'interessaran.`
      );
    } else if (byDate === "dema") {
      return createPageData(
        `${categorySEO.titleSuffix} demà ${labelWithArticle}`,
        `${categorySEO.titleSuffix} demà ${labelWithArticle}. Agenda actualitzada.`,
        `${categoryTitle} demà ${labelWithArticle} - Agenda Cultural`,
        `${categoryTitle} demà ${labelWithArticle}. ${categorySEO.description}.`,
        baseCanonical,
        `Ho sentim, però no hi ha ${
          categorySEO.noEventsText || categorySEO.description.split(",")[0]
        } demà ${labelWithArticle}. Descobreix altres opcions culturals que t'interessaran.`
      );
    } else if (byDate === "setmana") {
      return createPageData(
        `${categorySEO.titleSuffix} aquesta setmana ${labelWithArticle}`,
        `${categorySEO.titleSuffix} aquesta setmana ${labelWithArticle}. Agenda actualitzada.`,
        `${categoryTitle} aquesta setmana ${labelWithArticle} - Agenda Cultural`,
        `${categoryTitle} aquesta setmana ${labelWithArticle}. ${categorySEO.description}.`,
        baseCanonical,
        `Ho sentim, però no hi ha ${
          categorySEO.noEventsText || categorySEO.description.split(",")[0]
        } aquesta setmana ${labelWithArticle}. Descobreix altres opcions culturals que t'interessaran.`
      );
    } else if (byDate === "cap-de-setmana") {
      return createPageData(
        `${categorySEO.titleSuffix} aquest cap de setmana ${labelWithArticle}`,
        `${categorySEO.titleSuffix} aquest cap de setmana ${labelWithArticle}. Agenda actualitzada.`,
        `${categoryTitle} aquest cap de setmana ${labelWithArticle} - Agenda Cultural`,
        `${categoryTitle} aquest cap de setmana ${labelWithArticle}. ${categorySEO.description}.`,
        baseCanonical,
        `Ho sentim, però no hi ha ${
          categorySEO.noEventsText || categorySEO.description.split(",")[0]
        } aquest cap de setmana ${labelWithArticle}. Descobreix altres opcions culturals que t'interessaran.`
      );
    } else {
      // General category page without date filter
      return createPageData(
        `${categorySEO.titleSuffix} ${labelWithArticle}`,
        `${categorySEO.titleSuffix} ${labelWithArticle}. Agenda cultural actualitzada.`,
        `${categoryTitle} ${labelWithArticle} - Agenda Cultural Catalunya`,
        `${categoryTitle} ${labelWithArticle}. ${categorySEO.description}.`,
        baseCanonical,
        `Ho sentim, però no hi ha ${
          categorySEO.noEventsText || categorySEO.description.split(",")[0]
        } ${labelWithArticle}. Descobreix altres opcions culturals que t'interessaran.`
      );
    }
  }

  if (type === "region" && !byDate) {
    return createPageData(
      `Què fer ${labelWithArticle}. Agenda ${currentYear}`,
      `Agenda cultural ${labelWithArticle} aquest ${month}. Selecció d’activitats.`,
      `Esdeveniments destacats ${labelWithArticle}. Agenda ${currentYear}`,
      `Esdeveniments culturals i propostes destacades ${labelWithArticle} aquest ${month}.`,
      `${siteUrl}/${place}`,
      `Ho sentim, però no hi ha esdeveniments ${labelWithArticle}. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
    );
  }

  if (type === "town" && !byDate) {
    return createPageData(
      `Què fer ${labelWithArticle}. Agenda ${currentYear}`,
      `Agenda cultural ${labelWithArticle} aquest ${month}. Activitats destacades.`,
      `Guia d'activitats ${labelWithArticle} - ${month} ${currentYear}`,
      `Concerts, exposicions i més ${labelWithArticle} aquest ${month}.`,
      `${siteUrl}/${place}`,
      `Ho sentim, però no hi ha esdeveniments ${labelWithArticle}. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
    );
  }

  if (byDate && place) {
    if (byDate === "avui") {
      return createPageData(
        `Què fer ${byDate} ${labelWithArticle}`,
        `Agenda ${byDate} ${labelWithArticle}. Selecció d’activitats.`,
        `Esdeveniments ${byDate} ${labelWithArticle}`,
        `Esdeveniments ${byDate} ${labelWithArticle}. Agenda cultural actualitzada.`,
        `${siteUrl}/${place}/${byDate}`,
        `Ho sentim, però no hi ha esdeveniments avui ${labelWithArticle}. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
      );
    } else if (byDate === "dema") {
      return createPageData(
        `Què fer demà ${labelWithArticle}`,
        `Agenda demà ${labelWithArticle}. Selecció d’activitats.`,
        `Esdeveniments demà ${labelWithArticle}`,
        `Esdeveniments demà ${labelWithArticle}. Agenda cultural actualitzada.`,
        `${siteUrl}/${place}/${byDate}`,
        `Ho sentim, però no hi ha esdeveniments demà ${labelWithArticle}. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
      );
    } else if (byDate === "setmana") {
      return createPageData(
        `Agenda setmanal ${labelWithArticle}`,
        `Agenda aquesta ${byDate} ${labelWithArticle}. Activitats destacades.`,
        `Esdeveniments aquesta ${byDate} ${labelWithArticle}`,
        `Esdeveniments aquesta ${byDate} ${labelWithArticle}. Agenda cultural actualitzada.`,
        `${siteUrl}/${place}/${byDate}`,
        `Ho sentim, però no hi ha esdeveniments aquesta setmana ${labelWithArticle}. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
      );
    } else if (byDate === "cap-de-setmana") {
      return createPageData(
        `Què fer aquest cap de setmana ${labelWithArticle}`,
        `Agenda aquest cap de setmana ${labelWithArticle}. Activitats destacades.`,
        `Plans per aquest cap de setmana ${labelWithArticle}`,
        `Esdeveniments aquest cap de setmana ${labelWithArticle}. Agenda cultural actualitzada.`,
        `${siteUrl}/${place}/${byDate}`,
        `Ho sentim, però no hi ha esdeveniments aquest cap de setmana ${labelWithArticle}. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
      );
    }
  }

  if (byDate && !place) {
    if (byDate === "avui") {
      return createPageData(
        "Què fer avui a Catalunya",
        "Agenda avui a Catalunya. Selecció d’activitats.",
        "Esdeveniments avui a Catalunya",
        "Esdeveniments avui a Catalunya. Agenda cultural actualitzada.",
        `${siteUrl}/${byDate}`,
        "Ho sentim, però no hi ha esdeveniments avui a Catalunya. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions."
      );
    } else if (byDate === "dema") {
      return createPageData(
        "Què fer demà a Catalunya",
        "Agenda demà a Catalunya. Selecció d’activitats.",
        "Esdeveniments demà a Catalunya",
        "Esdeveniments demà a Catalunya. Agenda cultural actualitzada.",
        `${siteUrl}/${byDate}`,
        "Ho sentim, però no hi ha esdeveniments demà a Catalunya. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions."
      );
    } else if (byDate === "setmana") {
      return createPageData(
        "Agenda setmanal a Catalunya",
        "Agenda aquesta setmana a Catalunya. Activitats destacades.",
        "Esdeveniments aquesta setmana a Catalunya",
        "Esdeveniments aquesta setmana a Catalunya. Agenda cultural actualitzada.",
        `${siteUrl}/${byDate}`,
        "Ho sentim, però no hi ha esdeveniments aquesta setmana a Catalunya. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions."
      );
    } else if (byDate === "cap-de-setmana") {
      return createPageData(
        "Què fer aquest cap de setmana a Catalunya",
        "Agenda aquest cap de setmana a Catalunya. Activitats destacades.",
        "Esdeveniments aquest cap de setmana a Catalunya",
        "Esdeveniments aquest cap de setmana a Catalunya. Agenda cultural actualitzada.",
        `${siteUrl}/${byDate}`,
        "Ho sentim, però no hi ha esdeveniments aquest cap de setmana a Catalunya. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions."
      );
    }
  }

  // Default fallback
  return createPageData(
    `Què fer a Catalunya. Agenda ${currentYear}`,
    `Agenda cultural de Catalunya aquest ${month}. Selecció d’activitats.`,
    `Descobreix esdeveniments a Catalunya aquest ${currentYear}`,
    `Esdeveniments culturals, concerts, exposicions i més a Catalunya.`,
    siteUrl,
    `Ho sentim, però no hi ha esdeveniments a Catalunya. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
  );
}
