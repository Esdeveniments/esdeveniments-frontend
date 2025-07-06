import { siteUrl } from "@config/index";
import { monthsName } from "@utils/helpers";
import { getPlaceTypeAndLabel } from "@utils/helpers";
import {
  PageData,
  GeneratePagesDataProps,
  PlaceTypeAndLabel,
} from "types/common";

const FEMININE_REGIONS = ["selva"];
const month = monthsName[new Date().getMonth()];

// Category-specific SEO templates with cultural context
// Mapped to match backend categories exactly
const CATEGORY_SEO_TEMPLATES = {
  literatura: {
    titleSuffix: "Literatura i llibres",
    description:
      "literatura, llibres, presentacions literàries, clubs de lectura",
    culturalContext: "Descobreix el món de la literatura catalana",
  },
  "fires-i-mercats": {
    titleSuffix: "Fires i mercats",
    description: "fires, mercats, esdeveniments comercials, artesania",
    culturalContext: "Descobreix fires i mercats tradicionals",
  },
  "festes-populars": {
    titleSuffix: "Festes populars",
    description: "festes populars, celebracions tradicionals, cultura popular",
    culturalContext: "Participa en les millors festes populars catalanes",
  },
  "tallers-i-formacio": {
    titleSuffix: "Tallers i formació",
    description: "tallers, formació, cursos, aprenentatge",
    culturalContext: "Aprèn i forma't amb els millors tallers",
  },
  dansa: {
    titleSuffix: "Dansa i ball",
    description: "dansa, ball, espectacles de dansa, classes de ball",
    culturalContext: "Viu la passió de la dansa",
  },
  "salut-i-benestar": {
    titleSuffix: "Salut i benestar",
    description: "salut, benestar, activitats saludables, wellness",
    culturalContext: "Cuida't amb activitats de salut i benestar",
  },
  esport: {
    titleSuffix: "Esport i activitat física",
    description: "esport, activitat física, competicions esportives",
    culturalContext: "Mantén-te actiu amb les millors activitats esportives",
  },
  "patrimoni-cultural": {
    titleSuffix: "Patrimoni cultural",
    description: "patrimoni cultural, història, monuments, tradicions",
    culturalContext: "Descobreix el ric patrimoni cultural català",
  },
  "serveis-municipals": {
    titleSuffix: "Serveis municipals",
    description:
      "serveis municipals, administració, tràmits, informació ciutadana",
    culturalContext: "Informa't sobre els serveis municipals disponibles",
  },
  "gent-gran": {
    titleSuffix: "Activitats per a la gent gran",
    description: "activitats per a gent gran, sèniors, tercera edat",
    culturalContext:
      "Descobreix activitats especialment pensades per a la gent gran",
  },
  "familia-i-infants": {
    titleSuffix: "Família i infants",
    description: "activitats familiars, infants, nens, diversió familiar",
    culturalContext: "Diversió per a tota la família",
  },
  exposicions: {
    titleSuffix: "Exposicions i art",
    description: "exposicions, galeries d'art, museus, art visual",
    culturalContext: "Explora l'art i la cultura visual",
  },
  cinema: {
    titleSuffix: "Cinema i audiovisual",
    description: "cinema, projeccions, festivals de cinema, audiovisual",
    culturalContext: "Gaudeix del millor cinema",
  },
  musica: {
    titleSuffix: "Música i concerts",
    description: "música, concerts, espectacles musicals, festivals musicals",
    culturalContext: "Descobreix la millor música en viu",
  },
  teatre: {
    titleSuffix: "Teatre i arts escèniques",
    description: "teatre, òpera, arts escèniques, espectacles teatrals",
    culturalContext: "Viu les millors obres teatrals",
  },
  altres: {
    titleSuffix: "Altres activitats",
    description: "altres activitats, esdeveniments diversos, miscel·lània",
    culturalContext: "Descobreix altres activitats interessants",
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
  subTitle,
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
  const labelEmpty = label;
  let labelWithArticle = label;

  if (type === "region") {
    if (FEMININE_REGIONS.includes(label.toLowerCase())) {
      labelWithArticle = `a la ${label}`;
    } else if (
      ["a", "e", "i", "o", "u", "h"].includes(label.charAt(0).toLowerCase())
    ) {
      labelWithArticle = `a ${label}`;
    } else {
      labelWithArticle = `al ${label}`;
    }
  } else {
    if (
      ["a", "e", "i", "o", "u", "h"].includes(label.charAt(0).toLowerCase())
    ) {
      labelWithArticle = `a ${label}`;
    } else {
      labelWithArticle = `a ${label}`;
    }
  }

  // Get category-specific SEO data
  const categorySEO = getCategorySEO(category);

  if (!place && !byDate) {
    return createPageData(
      `Què fer a Catalunya. Agenda ${currentYear}`,
      `Viu aquest ${month} com mai amb les millors activitats de la temporada: mercats, exposicions, descobriments, passejades, concerts, museus, teatre... No et quedis sense provar tots aquests plans imprescindibles per aprofitar-lo al màxim!`,
      `Descobreix esdeveniments a Catalunya aquest ${currentYear}`,
      `Descobreix els millors esdeveniments de Catalunya: concerts, exposicions, mercats i més. Participa en l'agenda cultural catalana i fes-la créixer!`,
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
        `${categorySEO.culturalContext} avui ${labelWithArticle}. Descobreix la millor selecció d'esdeveniments culturals del dia.`,
        `${categoryTitle} avui ${labelWithArticle} - Agenda Cultural`,
        `${categorySEO.culturalContext} avui ${labelWithArticle}. Agenda actualitzada amb ${categorySEO.description} i esdeveniments culturals destacats.`,
        baseCanonical,
        `Ho sentim, però no hi ha ${
          categorySEO.description.split(",")[0]
        } avui ${labelWithArticle}. Descobreix altres opcions culturals que t'interessaran.`
      );
    } else if (byDate === "dema") {
      return createPageData(
        `${categorySEO.titleSuffix} demà ${labelWithArticle}`,
        `${categorySEO.culturalContext} demà ${labelWithArticle}. Planifica la teva jornada cultural amb els millors esdeveniments.`,
        `${categoryTitle} demà ${labelWithArticle} - Agenda Cultural`,
        `${categorySEO.culturalContext} demà ${labelWithArticle}. Agenda actualitzada amb ${categorySEO.description} i esdeveniments culturals destacats.`,
        baseCanonical,
        `Ho sentim, però no hi ha ${
          categorySEO.description.split(",")[0]
        } demà ${labelWithArticle}. Descobreix altres opcions culturals que t'interessaran.`
      );
    } else if (byDate === "setmana") {
      return createPageData(
        `${categorySEO.titleSuffix} aquesta setmana ${labelWithArticle}`,
        `${categorySEO.culturalContext} aquesta setmana ${labelWithArticle}. Setmana plena d'activitats culturals per a tots els gustos.`,
        `${categoryTitle} aquesta setmana ${labelWithArticle} - Agenda Cultural`,
        `${categorySEO.culturalContext} aquesta setmana ${labelWithArticle}. Agenda setmanal amb ${categorySEO.description} i esdeveniments culturals destacats.`,
        baseCanonical,
        `Ho sentim, però no hi ha ${
          categorySEO.description.split(",")[0]
        } aquesta setmana ${labelWithArticle}. Descobreix altres opcions culturals que t'interessaran.`
      );
    } else if (byDate === "cap-de-setmana") {
      return createPageData(
        `${categorySEO.titleSuffix} aquest cap de setmana ${labelWithArticle}`,
        `${categorySEO.culturalContext} aquest cap de setmana ${labelWithArticle}. Les millors propostes culturals per al teu temps lliure.`,
        `${categoryTitle} aquest cap de setmana ${labelWithArticle} - Agenda Cultural`,
        `${categorySEO.culturalContext} aquest cap de setmana ${labelWithArticle}. Agenda de cap de setmana amb ${categorySEO.description} i esdeveniments culturals destacats.`,
        baseCanonical,
        `Ho sentim, però no hi ha ${
          categorySEO.description.split(",")[0]
        } aquest cap de setmana ${labelWithArticle}. Descobreix altres opcions culturals que t'interessaran.`
      );
    } else {
      // General category page without date filter
      return createPageData(
        `${categorySEO.titleSuffix} ${labelWithArticle}`,
        `${categorySEO.culturalContext} ${labelWithArticle}. Descobreix la millor agenda cultural amb esdeveniments destacats.`,
        `${categoryTitle} ${labelWithArticle} - Agenda Cultural Catalunya`,
        `${categorySEO.culturalContext} ${labelWithArticle}. Agenda cultural catalana amb ${categorySEO.description} i esdeveniments destacats durant tot l'any.`,
        baseCanonical,
        `Ho sentim, però no hi ha ${
          categorySEO.description.split(",")[0]
        } ${labelWithArticle}. Descobreix altres opcions culturals que t'interessaran.`
      );
    }
  }

  if (type === "region" && !byDate) {
    return createPageData(
      `Què fer ${labelWithArticle}. Agenda ${currentYear}`,
      `Les millors coses per fer ${labelWithArticle}: mercats, exposicions,
      descobriments, passejades, concerts, museus, teatre... Aquests són els
      millors plans per gaudir aquest ${month}!`,
      `Esdeveniments destacats ${labelWithArticle}. Agenda ${currentYear}`,
      `Descobreix amb els millors actes culturals clau aquest ${month} ${labelWithArticle}. Des de concerts fins a exposicions, la nostra agenda col·laborativa catalana t'espera.`,
      `${siteUrl}/${place}`,
      `Ho sentim, però no hi ha esdeveniments ${labelWithArticle}. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
    );
  }

  if (type === "town" && !byDate) {
    return createPageData(
      `Què fer ${labelWithArticle}. Agenda ${currentYear}`,
      `Explora les millors activitats ${labelWithArticle}: mercats, exposicions, passejades, concerts, i més. Viu intensament ${labelEmpty} aquest ${month}.`,
      `Guia d'activitats ${labelWithArticle} - ${month} ${currentYear}`,
      `Descobreix els esdeveniments imperdibles ${labelWithArticle} aquest ${currentYear}. Concerts, exposicions, teatre i més t'esperen. Suma't a la nostra agenda col·laborativa catalana.`,
      `${siteUrl}/${place}`,
      `Ho sentim, però no hi ha esdeveniments ${labelWithArticle}. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
    );
  }

  if (byDate && place) {
    if (byDate === "avui") {
      return createPageData(
        `Què fer ${byDate} ${labelWithArticle}`,
        `Aprofita el teu temps i troba el que necessites: el millor del dia al teu abast.`,
        `Esdeveniments ${byDate} ${labelWithArticle}`,
        `Què fer ${byDate} ${labelWithArticle}. Us oferim tota la informació per gaudir ${labelEmpty} i de la seva enorme activitat cultural: cinema, museus, teatre, mercats, familiar.`,
        `${siteUrl}/${place}/${byDate}`,
        `Ho sentim, però no hi ha esdeveniments avui ${labelWithArticle}. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
      );
    } else if (byDate === "dema") {
      return createPageData(
        `Què fer demà ${labelWithArticle}`,
        `Aprofita el teu temps i troba el que necessites: el millor de demà al teu abast.`,
        `Esdeveniments demà ${labelWithArticle}`,
        `Què fer demà ${labelWithArticle}. Us oferim tota la informació per gaudir ${labelEmpty} i de la seva enorme activitat cultural: cinema, museus, teatre, mercats, familiar.`,
        `${siteUrl}/${place}/${byDate}`,
        `Ho sentim, però no hi ha esdeveniments demà ${labelWithArticle}. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
      );
    } else if (byDate === "setmana") {
      return createPageData(
        `Agenda setmanal ${labelWithArticle}`,
        `Us proposem activitats d'oci i cultura ${labelWithArticle} per a tots els gustos i butxaques aquesta ${byDate}.`,
        `Esdeveniments aquesta ${byDate} ${labelWithArticle}`,
        `Què fer aquesta ${byDate} ${labelWithArticle}. Teniu ganes de gaudir de aquesta setmana? Teatre, cinema, música, art i altres excuses per no parar de descobrir ${labelEmpty}!`,
        `${siteUrl}/${place}/${byDate}`,
        `Ho sentim, però no hi ha esdeveniments aquesta setmana ${labelWithArticle}. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
      );
    } else if (byDate === "cap-de-setmana") {
      return createPageData(
        `Què fer aquest cap de setmana ${labelWithArticle}`,
        `Les millors propostes per esprémer al màxim el cap de setmana ${labelWithArticle}, de divendres a diumenge.`,
        `Plans per aquest cap de setmana ${labelWithArticle}`,
        `Què fer aquest cap de setmana ${labelWithArticle}. Les millors propostes culturals per esprémer al màxim el cap de setmana, de divendres a diumenge.`,
        `${siteUrl}/${place}/${byDate}`,
        `Ho sentim, però no hi ha esdeveniments aquest cap de setmana ${labelWithArticle}. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
      );
    }
  }

  if (byDate && !place) {
    if (byDate === "avui") {
      return createPageData(
        "Què fer avui a Catalunya",
        "Aprofita el teu temps i troba el que necessites: el millor del dia al teu abast.",
        "Esdeveniments avui a Catalunya",
        "Què fer avui a Catalunya. Us oferim tota la informació per gaudir de la seva enorme activitat cultural catalana: cinema, museus, teatre, mercats, familiar.",
        `${siteUrl}/${byDate}`,
        "Ho sentim, però no hi ha esdeveniments avui a Catalunya. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions."
      );
    } else if (byDate === "dema") {
      return createPageData(
        "Què fer demà a Catalunya",
        "Aprofita el teu temps i troba el que necessites: el millor de demà al teu abast.",
        "Esdeveniments demà a Catalunya",
        "Què fer demà a Catalunya. Us oferim tota la informació per gaudir de la seva enorme activitat cultural catalana: cinema, museus, teatre, mercats, familiar.",
        `${siteUrl}/${byDate}`,
        "Ho sentim, però no hi ha esdeveniments demà a Catalunya. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions."
      );
    } else if (byDate === "setmana") {
      return createPageData(
        "Agenda setmanal a Catalunya",
        "Us proposem activitats d'oci i cultura a Catalunya per a tots els gustos i butxaques aquesta setmana.",
        "Esdeveniments aquesta setmana a Catalunya",
        "Què fer aquesta setmana a Catalunya. Teniu ganes de gaudir de aquesta setmana? Teatre, cinema, música, art i altres excuses per no parar de descobrir Catalunya!",
        `${siteUrl}/${byDate}`,
        "Ho sentim, però no hi ha esdeveniments aquesta setmana a Catalunya. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions."
      );
    } else if (byDate === "cap-de-setmana") {
      return createPageData(
        "Què fer aquest cap de setmana a Catalunya",
        "Descobreix les millors activitats per fer aquest cap de setmana a Catalunya. Mercats, exposicions, concerts, teatre i molt més!",
        "Esdeveniments aquest cap de setmana a Catalunya",
        "Què fer aquest cap de setmana a Catalunya. Us oferim tota la informació per gaudir de la seva enorme activitat cultural catalana: cinema, museus, teatre, mercats, familiar.",
        `${siteUrl}/${byDate}`,
        "Ho sentim, però no hi ha esdeveniments aquest cap de setmana a Catalunya. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions."
      );
    }
  }

  // Default fallback
  return createPageData(
    `Què fer a Catalunya. Agenda ${currentYear}`,
    `Viu aquest ${month} com mai amb les millors activitats de la temporada: mercats, exposicions, descobriments, passejades, concerts, museus, teatre... 
    No et quedis sense provar tots aquests plans imprescindibles per aprofitar-lo al màxim!`,
    `Descobreix esdeveniments a Catalunya aquest ${currentYear}`,
    `Descobreix els millors esdeveniments de Catalunya: concerts, exposicions, mercats i més. Participa en l'agenda cultural catalana i fes-la créixer!`,
    siteUrl,
    `Ho sentim, però no hi ha esdeveniments a Catalunya. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
  );
}
