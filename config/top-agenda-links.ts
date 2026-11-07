import type { SeoLinkItem } from "types/props";
import type { AppLocale } from "types/i18n";
import { formatPlacePreposition } from "@utils/string-helpers";

/**
 * Top agenda links for featured local agendas.
 * Town names are not localized; the label comes from `Config.TopAgenda.agendaOf`.
 */
export const TOP_AGENDA_LINKS: (Omit<SeoLinkItem, "label"> & {
  name: string;
})[] = [
  { href: "/la-garriga", name: "La Garriga" },
  { href: "/granollers", name: "Granollers" },
  { href: "/cardedeu", name: "Cardedeu" },
  { href: "/malgrat-de-mar", name: "Malgrat de Mar" },
  { href: "/calella", name: "Calella" },
  { href: "/arenys-de-mar", name: "Arenys de Mar" },
  { href: "/llinars-del-valles", name: "Llinars del Vallès" },
  { href: "/el-masnou", name: "El Masnou" },
  { href: "/canet-de-mar", name: "Canet de Mar" },
  { href: "/castellbisbal", name: "Castellbisbal" },
  { href: "/llica-de-vall", name: "Lliçà de Vall" },
  { href: "/arenys-de-munt", name: "Arenys de Munt" },
  { href: "/mataro", name: "Mataró" },
];

/** Links labelled "Agenda del Masnou" / "Agenda de El Masnou" / "Agenda of El Masnou"; chips show `shortLabel` ("El Masnou"). */
export function buildTopAgendaLinks(
  formatLabel: (placeOf: string) => string,
  locale: AppLocale
): SeoLinkItem[] {
  return TOP_AGENDA_LINKS.map(({ href, name }) => ({
    href,
    shortLabel: name,
    label: formatLabel(
      formatPlacePreposition(name, "town", locale, false, "of")
    ),
  }));
}
