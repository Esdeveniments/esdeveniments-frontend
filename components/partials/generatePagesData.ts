import { siteUrl } from "@config/index";
import { monthsName } from "@utils/helpers";
import { getPlaceTypeAndLabel } from "@utils/helpers";
import {
  PageData,
  GeneratePagesDataProps,
  PlaceTypeAndLabel,
} from "types/common";
import { formatCatalanA } from "@utils/helpers";
import {
  appendSearchQuery,
  splitNotFoundText,
} from "@utils/notFoundMessaging";

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
      "literatura, llibres, presentacions literàries, clubs de lectura, trobades amb autors",
    culturalContext:
      "Descobreix el món de la literatura catalana amb presentacions, clubs de lectura i trobades amb autors",
    noEventsText: "activitats literàries o presentacions de llibres",
  },
  "fires-i-mercats": {
    titleSuffix: "Fires i mercats",
    description:
      "fires, mercats, esdeveniments comercials, artesania, productes locals",
    culturalContext:
      "Descobreix fires i mercats tradicionals amb productes locals, artesania i ambient festiu",
    noEventsText: "fires ni mercats a la zona",
  },
  "festes-populars": {
    titleSuffix: "Festes populars",
    description:
      "festes populars, celebracions tradicionals, cultura popular, correfocs, castells",
    culturalContext:
      "Participa en les millors festes populars catalanes amb correfocs, castellers i tradicions úniques",
    noEventsText: "festes populars o celebracions tradicionals",
  },
  "tallers-i-formacio": {
    titleSuffix: "Tallers i formació",
    description:
      "tallers, formació, cursos, aprenentatge, activitats pràctiques",
    culturalContext:
      "Aprèn i forma't amb tallers pràctics, cursos especialitzats i activitats formatives",
    noEventsText: "tallers, cursos ni activitats de formació",
  },
  dansa: {
    titleSuffix: "Dansa i ball",
    description:
      "dansa, ball, espectacles de dansa, classes de ball, dansa contemporània",
    culturalContext:
      "Viu la passió de la dansa amb espectacles, tallers i classes de ball per a tots els nivells",
    noEventsText: "activitats de dansa o ball",
  },
  "salut-i-benestar": {
    titleSuffix: "Salut i benestar",
    description:
      "salut, benestar, activitats saludables, ioga, meditació, wellness",
    culturalContext:
      "Cuida’t amb activitats de salut i benestar, sessions de ioga, meditació i hàbits saludables",
    noEventsText: "activitats de salut, benestar o ioga",
  },
  esport: {
    titleSuffix: "Esport i activitat física",
    description:
      "esport, activitat física, competicions esportives, curses populars",
    culturalContext:
      "Mantén-te actiu amb activitats esportives, competicions, curses populars i propostes a l’aire lliure",
    noEventsText: "activitats o esdeveniments esportius",
  },
  "patrimoni-cultural": {
    titleSuffix: "Patrimoni cultural",
    description:
      "patrimoni cultural, història, monuments, tradicions, visites guiades",
    culturalContext:
      "Descobreix el ric patrimoni cultural català amb visites guiades, rutes històriques i monuments",
    noEventsText: "activitats relacionades amb el patrimoni cultural",
  },
  "serveis-municipals": {
    titleSuffix: "Serveis municipals",
    description:
      "serveis municipals, administració, tràmits, informació ciutadana, participació",
    culturalContext:
      "Informa’t sobre els serveis municipals disponibles, tràmits, oficines i informació per a la ciutadania",
    noEventsText: "activitats o informacions de serveis municipals",
  },
  "gent-gran": {
    titleSuffix: "Activitats per a la gent gran",
    description:
      "activitats per a gent gran, sèniors, tercera edat, casal de gent gran",
    culturalContext:
      "Descobreix activitats especialment pensades per a la gent gran: tallers, xerrades, esport suau i trobades socials",
    noEventsText: "activitats destinades a la gent gran",
  },
  "familia-i-infants": {
    titleSuffix: "Família i infants",
    description:
      "activitats familiars, infants, nens, diversió familiar, plans amb nens",
    culturalContext:
      "Diversió per a tota la família amb activitats per a infants, espectacles familiars i plans amb nens",
    noEventsText: "activitats familiars o per a infants",
  },
  exposicions: {
    titleSuffix: "Exposicions i art",
    description:
      "exposicions, galeries d'art, museus, art visual, rutes culturals",
    culturalContext:
      "Explora l’art i la cultura visual amb exposicions, museus i rutes culturals",
    noEventsText: "exposicions o activitats d’art",
  },
  cinema: {
    titleSuffix: "Cinema i audiovisual",
    description:
      "cinema, projeccions, festivals de cinema, audiovisual, cinefòrum",
    culturalContext:
      "Gaudeix del millor cinema amb projeccions, festivals i cinefòrums",
    noEventsText: "projeccions de cinema o activitats audiovisuals",
  },
  musica: {
    titleSuffix: "Música i concerts",
    description:
      "música, concerts, espectacles musicals, festivals musicals, música en directe",
    culturalContext:
      "Descobreix la millor música en viu amb concerts, festivals i actuacions a prop teu",
    noEventsText: "concerts, festivals o espectacles musicals",
  },
  teatre: {
    titleSuffix: "Teatre i arts escèniques",
    description:
      "teatre, òpera, arts escèniques, espectacles teatrals, monòlegs",
    culturalContext:
      "Viu les millors obres teatrals, monòlegs i espectacles d’arts escèniques",
    noEventsText: "obres de teatre o espectacles d’arts escèniques",
  },
  altres: {
    titleSuffix: "Altres activitats",
    description:
      "altres activitats, esdeveniments diversos, miscel·lània, plans originals",
    culturalContext:
      "Descobreix altres activitats interessants i plans originals per al teu temps lliure",
    noEventsText: "activitats en aquesta categoria",
  },
};

const baseCreatePageData = (
  title: string,
  subTitle: string,
  metaTitle: string,
  metaDescription: string,
  canonical: string,
  notFoundText: string,
  searchQuery?: string
): PageData => {
  const { title: notFoundTitle, description: notFoundDescription } =
    splitNotFoundText(notFoundText, searchQuery);
  return {
    title,
    subTitle: normalizeSubTitle(subTitle),
    metaTitle,
    metaDescription,
    canonical,
    notFoundTitle,
    notFoundDescription,
  };
};

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
  search,
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
  const createPageData = (
    title: string,
    subTitle: string,
    metaTitle: string,
    metaDescription: string,
    canonical: string,
    notFoundText: string
  ) =>
    baseCreatePageData(
      title,
      subTitle,
      metaTitle,
      metaDescription,
      canonical,
      notFoundText,
      search
    );

  if (!place && !byDate) {
    return createPageData(
      `Què fer a Catalunya. Agenda ${currentYear}`,
      `Agenda cultural de Catalunya aquest ${month}, amb concerts, exposicions, teatre, activitats familiars i plans per a totes les edats.`,
      `Descobreix esdeveniments a Catalunya aquest ${currentYear}`,
      `Explora la millor agenda cultural de Catalunya aquest ${month}. Troba concerts, exposicions, teatre, activitats familiars i plans gratuïts a prop teu.`,
      siteUrl,
      `Ho sentim, però no hi ha esdeveniments disponibles a Catalunya en aquest moment. Mira altres dates o localitats properes a la nostra agenda cultural, on segur que hi trobaràs plans que t’agradaran.`
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
        `${categorySEO.titleSuffix} avui ${labelWithArticle}, amb propostes culturals actualitzades, plans de darrera hora i activitats per a tots els gustos.`,
        `${categoryTitle} avui ${labelWithArticle} - Agenda cultural i plans`,
        `${categorySEO.culturalContext} avui ${labelWithArticle}. Consulta l’agenda per descobrir plans per avui: horaris, espais, activitats per a famílies i opcions gratuïtes.`,
        baseCanonical,
        `Ho sentim, però no hi ha ${
          categorySEO.noEventsText || categorySEO.description.split(",")[0]
        } avui ${labelWithArticle}. Mira les propostes per demà, aquest cap de setmana o altres localitats properes per trobar plans que et puguin interessar.`
      );
    } else if (byDate === "dema") {
      return createPageData(
        `${categorySEO.titleSuffix} demà ${labelWithArticle}`,
        `${categorySEO.titleSuffix} demà ${labelWithArticle}, amb activitats destacades, plans per sortir i propostes per gaudir de la cultura.`,
        `${categoryTitle} demà ${labelWithArticle} - Idees i plans culturals`,
        `${categorySEO.culturalContext} demà ${labelWithArticle}. Avança’t i troba els millors plans per demà: activitats familiars, propostes de nit i esdeveniments culturals a prop teu.`,
        baseCanonical,
        `Ho sentim, però no hi ha ${
          categorySEO.noEventsText || categorySEO.description.split(",")[0]
        } demà ${labelWithArticle}. Consulta l’agenda per avui, aquesta setmana o altres destinacions properes per trobar noves propostes.`
      );
    } else if (byDate === "setmana") {
      return createPageData(
        `${categorySEO.titleSuffix} aquesta setmana ${labelWithArticle}`,
        `${categorySEO.titleSuffix} aquesta setmana ${labelWithArticle}, amb concerts, tallers, exposicions i activitats familiars per omplir la teva agenda.`,
        `${categoryTitle} aquesta setmana ${labelWithArticle} - Agenda completa`,
        `${categorySEO.culturalContext} aquesta setmana ${labelWithArticle}. Descobreix una selecció d’activitats destacades, plans per al cap de setmana i propostes gratuïtes per a totes les edats.`,
        baseCanonical,
        `Ho sentim, però no hi ha ${
          categorySEO.noEventsText || categorySEO.description.split(",")[0]
        } aquesta setmana ${labelWithArticle}. Prova de canviar la data o explora altres municipis i comarques properes per trobar nous plans.`
      );
    } else if (byDate === "cap-de-setmana") {
      return createPageData(
        `${categorySEO.titleSuffix} aquest cap de setmana ${labelWithArticle}`,
        `${categorySEO.titleSuffix} aquest cap de setmana ${labelWithArticle}, amb plans per sortir, activitats en família i propostes per descobrir la cultura local.`,
        `${categoryTitle} aquest cap de setmana ${labelWithArticle} - Plans i agenda`,
        `${categorySEO.culturalContext} aquest cap de setmana ${labelWithArticle}. Troba concerts, festes, activitats amb nens i altres plans per aprofitar al màxim el cap de setmana.`,
        baseCanonical,
        `Ho sentim, però no hi ha ${
          categorySEO.noEventsText || categorySEO.description.split(",")[0]
        } aquest cap de setmana ${labelWithArticle}. Consulta altres dates, explora activitats a la resta de Catalunya o ajusta els filtres de la cerca per descobrir més opcions.`
      );
    } else {
      // General category page without date filter
      return createPageData(
        `${categorySEO.titleSuffix} ${labelWithArticle}`,
        `${categorySEO.titleSuffix} ${labelWithArticle}, amb una selecció d’activitats culturals, plans familiars, propostes gratuïtes i esdeveniments destacats.`,
        `${categoryTitle} ${labelWithArticle} - Agenda cultural Catalunya`,
        `${categorySEO.culturalContext} ${labelWithArticle}. Consulta l’agenda cultural actualitzada i troba concerts, tallers, exposicions, activitats familiars i altres plans per al teu temps lliure.`,
        baseCanonical,
        `Ho sentim, però no hi ha ${
          categorySEO.noEventsText || categorySEO.description.split(",")[0]
        } ${labelWithArticle} en aquest moment. Prova amb altres dates, categories o localitats properes per descobrir noves propostes culturals.`
      );
    }
  }

  if (type === "region" && !byDate) {
    return createPageData(
      `Què fer ${labelWithArticle}. Agenda ${currentYear}`,
      `Agenda cultural ${labelWithArticle} aquest ${month}, amb concerts, exposicions, rutes culturals, activitats familiars i plans per al cap de setmana.`,
      `Esdeveniments destacats ${labelWithArticle}. Agenda ${currentYear}`,
      `Explora la millor agenda cultural ${labelWithArticle} aquest ${month}. Troba concerts, festivals, teatre, activitats per a nens i plans gratuïts per gaudir de la regió.`,
      `${siteUrl}/${place}`,
      `Ho sentim, però no hi ha esdeveniments ${labelWithArticle} en aquesta data. Mira altres dies, ajusta els filtres o consulta localitats properes per trobar nous plans i activitats.`
    );
  }

  if (type === "town" && !byDate) {
    return createPageData(
      `Què fer ${labelWithArticle}. Agenda ${currentYear}`,
      `Agenda cultural ${labelWithArticle} aquest ${month}, amb activitats de proximitat, plans en família, concerts, exposicions i festes populars.`,
      `Guia d'activitats ${labelWithArticle} - ${month} ${currentYear}`,
      `Descobreix què fer ${labelWithArticle} aquest ${month}. Consulta la guia amb concerts, festes, activitats familiars, tallers, exposicions i altres plans per gaudir del municipi.`,
      `${siteUrl}/${place}`,
      `Ho sentim, però no hi ha esdeveniments ${labelWithArticle} per a aquesta data. Prova de canviar la data, explorar altres categories o mirar municipis propers per trobar activitats que t’interessin.`
    );
  }

  if (byDate && place) {
    if (byDate === "avui") {
      return createPageData(
        `Què fer avui ${labelWithArticle}`,
        `Agenda d’avui ${labelWithArticle}, amb concerts, exposicions, activitats familiars, rutes i altres plans d’última hora.`,
        `Esdeveniments avui ${labelWithArticle} - Plans i agenda`,
        `Descobreix què fer avui ${labelWithArticle}. Consulta l’agenda cultural actualitzada amb concerts, festes, activitats amb nens, propostes gratuïtes i altres plans a prop teu.`,
        `${siteUrl}/${place}/${byDate}`,
        `Ho sentim, però no hi ha esdeveniments avui ${labelWithArticle}. Mira les propostes per demà, aquesta setmana o altres localitats properes per trobar plans que t’encaixin.`
      );
    } else if (byDate === "dema") {
      return createPageData(
        `Què fer demà ${labelWithArticle}`,
        `Agenda de demà ${labelWithArticle}, amb activitats culturals, plans familiars, música, teatre i esdeveniments especials.`,
        `Esdeveniments demà ${labelWithArticle} - Idees i plans`,
        `Descobreix què fer demà ${labelWithArticle}. Troba concerts, activitats per a nens, exposicions, rutes i altres plans per organitzar el teu dia amb antelació.`,
        `${siteUrl}/${place}/${byDate}`,
        `Ho sentim, però no hi ha esdeveniments demà ${labelWithArticle}. Consulta l’agenda per avui, aquesta setmana o altres destinacions properes per descobrir noves opcions.`
      );
    } else if (byDate === "setmana") {
      return createPageData(
        `Agenda setmanal ${labelWithArticle}`,
        `Agenda aquesta setmana ${labelWithArticle}, amb una selecció d’activitats culturals, concerts, tallers, plans familiars i propostes gratuïtes.`,
        `Esdeveniments aquesta setmana ${labelWithArticle} - Agenda completa`,
        `Explora l’agenda cultural aquesta setmana ${labelWithArticle}. Troba concerts, exposicions, teatre, activitats en família, rutes i altres plans per omplir la teva setmana.`,
        `${siteUrl}/${place}/${byDate}`,
        `Ho sentim, però no hi ha esdeveniments aquesta setmana ${labelWithArticle}. Prova altres setmanes, canvia de categoria o explora localitats properes per trobar més activitats.`
      );
    } else if (byDate === "cap-de-setmana") {
      return createPageData(
        `Què fer aquest cap de setmana ${labelWithArticle}`,
        `Agenda d’aquest cap de setmana ${labelWithArticle}, amb plans per sortir, activitats familiars, festes, música en directe i propostes a l’aire lliure.`,
        `Plans per aquest cap de setmana ${labelWithArticle} - Agenda`,
        `Descobreix els millors plans per aquest cap de setmana ${labelWithArticle}. Consulta concerts, festes populars, activitats amb nens, rutes i altres propostes culturals per aprofitar al màxim el cap de setmana.`,
        `${siteUrl}/${place}/${byDate}`,
        `Ho sentim, però no hi ha esdeveniments aquest cap de setmana ${labelWithArticle}. Consulta altres dates, explora categories diferents o mira què es fa a la resta de Catalunya per trobar nous plans.`
      );
    }
  }

  if (byDate && !place) {
    if (byDate === "avui") {
      return createPageData(
        "Què fer avui a Catalunya",
        "Agenda d’avui a Catalunya, amb concerts, exposicions, activitats familiars, festes populars i altres plans per a totes les edats.",
        "Esdeveniments avui a Catalunya - Plans i agenda",
        "Descobreix què fer avui a Catalunya. Consulta l’agenda cultural actualitzada amb concerts, festivals, activitats amb nens, propostes gratuïtes i plans d’última hora a tot el territori.",
        `${siteUrl}/${byDate}`,
        "Ho sentim, però no hi ha esdeveniments avui a Catalunya. Mira les propostes per demà, aquesta setmana o filtra per localitat i categoria per trobar altres plans interessants."
      );
    } else if (byDate === "dema") {
      return createPageData(
        "Què fer demà a Catalunya",
        "Agenda de demà a Catalunya, amb activitats culturals, música, teatre, exposicions i plans familiars arreu del país.",
        "Esdeveniments demà a Catalunya - Idees i plans",
        "Descobreix què fer demà a Catalunya. Troba concerts, activitats familiars, rutes, festes i altres plans per organitzar el teu temps lliure amb antelació.",
        `${siteUrl}/${byDate}`,
        "Ho sentim, però no hi ha esdeveniments demà a Catalunya. Consulta l’agenda per avui, aquesta setmana o explora diferents categories i localitats per descobrir noves opcions."
      );
    } else if (byDate === "setmana") {
      return createPageData(
        "Agenda setmanal a Catalunya",
        "Agenda aquesta setmana a Catalunya, amb una selecció de concerts, exposicions, teatre, festes, activitats familiars i propostes gratuïtes.",
        "Esdeveniments aquesta setmana a Catalunya - Agenda completa",
        "Explora l’agenda cultural aquesta setmana a Catalunya. Troba concerts, festivals, rutes, tallers, activitats per a nens i altres plans per omplir la teva setmana de cultura i lleure.",
        `${siteUrl}/${byDate}`,
        "Ho sentim, però no hi ha esdeveniments aquesta setmana a Catalunya. Prova de canviar la setmana, ajustar els filtres o explorar diferents zones del territori per trobar més activitats."
      );
    } else if (byDate === "cap-de-setmana") {
      return createPageData(
        "Què fer aquest cap de setmana a Catalunya",
        "Agenda d’aquest cap de setmana a Catalunya, amb plans per sortir, escapades, festes, concerts, activitats en família i rutes per tot el territori.",
        "Esdeveniments aquest cap de setmana a Catalunya - Plans i agenda",
        "Descobreix els millors plans per aquest cap de setmana a Catalunya. Consulta concerts, festes populars, activitats per a nens, rutes i altres propostes culturals i de lleure arreu del país.",
        `${siteUrl}/${byDate}`,
        "Ho sentim, però no hi ha esdeveniments aquest cap de setmana a Catalunya. Mira altres caps de setmana, explora diferents categories o centra’t en una zona concreta per trobar noves idees."
      );
    }
  }

  // Default fallback
  return createPageData(
    `Què fer a Catalunya. Agenda ${currentYear}`,
    `Agenda cultural de Catalunya aquest ${month}, amb concerts, exposicions, teatre, activitats familiars, festes populars i molts altres plans per al teu temps lliure.`,
    `Descobreix esdeveniments a Catalunya aquest ${currentYear}`,
    `Explora la millor agenda cultural de Catalunya. Troba concerts, rutes, festivals, activitats amb nens, propostes gratuïtes i altres plans per gaudir de ${currentYear}.`,
    siteUrl,
    `Ho sentim, però no hi ha esdeveniments disponibles a Catalunya en aquest moment. Prova altres dates, categories o localitats per descobrir noves propostes culturals i de lleure.`
  );
}
