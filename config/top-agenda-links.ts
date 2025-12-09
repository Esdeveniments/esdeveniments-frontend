import type { SeoLinkItem } from "types/props";

/**
 * Top agenda links for featured local agendas.
 * Town/region names are not localized; only the "Agenda" label is translated.
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
