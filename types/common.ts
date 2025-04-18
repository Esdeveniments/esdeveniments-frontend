export interface Option {
  label: string;
  value: string;
}

export type CategoryKey =
  | "Festes Majors"
  | "Festivals"
  | "Familiar"
  | "Música"
  | "Cinema"
  | "Teatre"
  | "Exposicions"
  | "Fires"
  | "Espectacles";

export type CategoryValue =
  | "Festa Major"
  | "Festival"
  | "Familiar"
  | "Música"
  | "Cinema"
  | "Teatre"
  | "Exposició"
  | "Fira"
  | "Espectacles";

export type Categories = Record<CategoryKey, CategoryValue>;

export interface CalendarUrls {
  google: string;
  outlook: string;
  ical: string;
}

export interface CalendarOption {
  name: string;
  url?: string;
  icon: string;
  download?: string;
}

export type DeleteReason =
  | "not-exist"
  | "duplicated"
  | "offensive"
  | "others"
  | null;
