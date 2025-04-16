import { siteUrl } from "@config/index";
import { monthsName } from "@utils/helpers";
import { getPlaceTypeAndLabel } from "@utils/helpers";

type ByDateOptions = "avui" | "dema" | "setmana" | "cap-de-setmana" | "";
type PlaceType = "region" | "town" | "";

export interface PageData {
  title: string;
  subTitle: string;
  metaTitle: string;
  metaDescription: string;
  canonical: string;
  notFoundText: string;
}

export interface GeneratePagesDataProps {
  currentYear: string | number;
  place?: string;
  byDate?: ByDateOptions;
}

export interface PlaceTypeAndLabel {
  type: PlaceType;
  label: string;
}

const FEMININE_REGIONS = ["selva"];
const month = monthsName[new Date().getMonth()];

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

export async function generatePagesData({ currentYear, place = "", byDate = "" }: GeneratePagesDataProps): Promise<PageData> {
  if (typeof currentYear === "number" && (currentYear < 2000 || currentYear > 3000)) {
    throw new Error("Invalid year range");
  }
  let { type, label }: PlaceTypeAndLabel = await getPlaceTypeAndLabel(place);
  const labelEmpty = label;

  if (type === "region") {
    if (FEMININE_REGIONS.includes(label.toLowerCase())) {
      label = `a la ${label}`;
    } else if (
      ["a", "e", "i", "o", "u", "h"].includes(label.charAt(0).toLowerCase())
    ) {
      label = `a ${label}`;
    } else {
      label = `al ${label}`;
    }
  } else {
    if (["a", "e", "i", "o", "u", "h"].includes(label.charAt(0).toLowerCase())) {
      label = `a ${label}`;
    } else {
      label = `a ${label}`;
    }
  }

  if (!place && !byDate) {
    return createPageData(
      `Què fer a Catalunya. Agenda ${currentYear}`,
      `Viu aquest ${month} com mai amb les millors activitats de la temporada: mercats, exposicions, descobriments, passejades, concerts, museus, teatre... No et quedis sense provar tots aquests plans imprescindibles per aprofitar-lo al màxim!`,
      `Descobreix esdeveniments a Catalunya aquest ${currentYear}`,
      `Descobreix els millors esdeveniments de Catalunya: concerts, exposicions, mercats i més. Participa en l'agenda cultural i fes-la créixer!`,
      siteUrl,
      `Ho sentim, però no hi ha esdeveniments a Catalunya. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
    );
  }

  if (type === "region" && !byDate) {
    return createPageData(
      `Què fer ${label}. Agenda ${currentYear}`,
      `Les millors coses per fer ${label}: mercats, exposicions,
      descobriments, passejades, concerts, museus, teatre... Aquests són els
      millors plans per gaudir aquest ${month}!`,
      `Esdeveniments destacats ${label}. Agenda ${currentYear}`,
      `Descobreix amb els millors actes culturals clau aquest ${month} ${label}. Des de concerts fins a exposicions, la nostra agenda col·laborativa t'espera.`,
      `${siteUrl}/${place}`,
      `Ho sentim, però no hi ha esdeveniments ${label}. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
    );
  }

  if (type === "town" && !byDate) {
    return createPageData(
      `Què fer ${label}. Agenda ${currentYear}`,
      `Explora les millors activitats ${label}: mercats, exposicions, passejades, concerts, i més. Viu intensament ${labelEmpty} aquest ${month}.`,
      `Guia d'activitats ${label} - ${month} ${currentYear}`,
      `Descobreix els esdeveniments imperdibles ${label} aquest ${currentYear}. Concerts, exposicions, i més t'esperen. Suma't a la nostra agenda col·laborativa.`,
      `${siteUrl}/${place}`,
      `Ho sentim, però no hi ha esdeveniments ${label}. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
    );
  }

  if (byDate && place) {
    if (byDate === "avui") {
      return createPageData(
        `Què fer ${byDate} ${label}`,
        `Aprofita el teu temps i troba el que necessites: el millor del dia al teu abast.`,
        `Esdeveniments ${byDate} ${label}`,
        `Què fer ${byDate} ${label}. Us oferim tota la informació per gaudir ${labelEmpty} i de la seva enorme activitat cultural: cinema, museus, teatre, mercats, familiar.`,
        `${siteUrl}/${place}/${byDate}`,
        `Ho sentim, però no hi ha esdeveniments avui ${label}. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
      );
    } else if (byDate === "dema") {
      return createPageData(
        `Què fer demà ${label}`,
        `Aprofita el teu temps i troba el que necessites: el millor de demà al teu abast.`,
        `Esdeveniments demà ${label}`,
        `Què fer demà ${label}. Us oferim tota la informació per gaudir ${labelEmpty} i de la seva enorme activitat cultural: cinema, museus, teatre, mercats, familiar.`,
        `${siteUrl}/${place}/${byDate}`,
        `Ho sentim, però no hi ha esdeveniments demà ${label}. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
      );
    } else if (byDate === "setmana") {
      return createPageData(
        `Agenda setmanal ${label}`,
        `Us proposem activitats d'oci i cultura ${label} per a tots els gustos i butxaques aquesta ${byDate}.`,
        `Esdeveniments aquesta ${byDate} ${label}`,
        `Què fer aquesta ${byDate} ${label}. Teniu ganes de gaudir de aquesta setmana? Teatre, cinema, música, art i altres excuses per no parar de descobrir ${labelEmpty}!`,
        `${siteUrl}/${place}/${byDate}`,
        `Ho sentim, però no hi ha esdeveniments aquesta setmana ${label}. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
      );
    } else if (byDate === "cap-de-setmana") {
      return createPageData(
        `Què fer aquest cap de setmana ${label}`,
        `Les millors propostes per esprémer al màxim el cap de setmana ${label}, de divendres a diumenge.`,
        `Plans per aquest cap de setmana ${label}`,
        `Què fer aquest cap de setmana ${label}. Les millors propostes culturals per esprémer al màxim el cap de setmana, de divendres a diumenge.`,
        `${siteUrl}/${place}/${byDate}`,
        `Ho sentim, però no hi ha esdeveniments aquest cap de setmana ${label}. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
      );
    }
  }

  if (byDate && !place) {
    if (byDate === "avui") {
      return createPageData(
        "Què fer avui a Catalunya",
        "Aprofita el teu temps i troba el que necessites: el millor del dia al teu abast.",
        "Esdeveniments avui a Catalunya",
        "Què fer avui a Catalunya. Us oferim tota la informació per gaudir de la seva enorme activitat cultural: cinema, museus, teatre, mercats, familiar.",
        `${siteUrl}/${byDate}`,
        "Ho sentim, però no hi ha esdeveniments avui a Catalunya. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions."
      );
    } else if (byDate === "dema") {
      return createPageData(
        "Què fer demà a Catalunya",
        "Aprofita el teu temps i troba el que necessites: el millor de demà al teu abast.",
        "Esdeveniments demà a Catalunya",
        "Què fer demà a Catalunya. Us oferim tota la informació per gaudir de la seva enorme activitat cultural: cinema, museus, teatre, mercats, familiar.",
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
        "Què fer aquest cap de setmana a Catalunya. Us oferim tota la informació per gaudir de la seva enorme activitat cultural: cinema, museus, teatre, mercats, familiar.",
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
    `Descobreix els millors esdeveniments de Catalunya: concerts, exposicions, mercats i més. Participa en l'agenda cultural i fes-la créixer!`,
    siteUrl,
    `Ho sentim, però no hi ha esdeveniments a Catalunya. Hem rebuscat en l'agenda i pot ser que també t'agradin aquestes altres opcions.`
  );
}
