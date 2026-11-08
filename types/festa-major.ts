/** One act of a festa major: the event fields the hubs render, kept lean for the cache. */
export interface FestaMajorAct {
  id: string;
  slug: string;
  title: string;
  startDate: string;
  startTime: string | null;
  endDate: string;
  endTime: string | null;
  location: string;
  /** The event's card image, with its cache key. */
  imageUrl?: string;
}

/** A festa major act with the town it belongs to (Catalonia-wide reads). */
export interface FestaMajorPlacedAct extends FestaMajorAct {
  citySlug: string;
  cityName: string;
  regionSlug: string | null;
  regionName: string | null;
}

/** A festa name read from an act title, e.g. "Festa Major de Sant Roc". */
export interface FestaMajorName {
  /** URL key: "sant-roc". "" is the town's own (unnamed) festa major. */
  key: string;
  /** Display label as written in Catalan, or null for the town's own one. */
  label: string | null;
}

/** One festa within a year: a run of acts close in time with the same name. */
export interface FestaMajorEdition extends FestaMajorName {
  /** YYYY-MM-DD of the first act. */
  start: string;
  /** YYYY-MM-DD of the last act's end (long exhibitions don't stretch it). */
  end: string;
  acts: FestaMajorAct[];
}

export type FestaMajorEditionSummary = Omit<FestaMajorEdition, "acts"> & {
  count: number;
  /** The first act's image, if any act has one. */
  imageUrl?: string;
};

/** Which year a hub shows: this year's acts, or last year's until they exist. */
export interface FestaMajorYearChoice {
  currentYear: number;
  year: number;
  isCurrentYear: boolean;
}

/** A town hub's data for the year it shows. */
export interface FestaMajorTownData extends FestaMajorYearChoice {
  acts: FestaMajorAct[];
  editions: FestaMajorEdition[];
  /** Last year's festes, shown as a reference when this year is shown. */
  previousEditions: FestaMajorEditionSummary[];
  /** This year's first acts, while last year's programme is still shown. */
  announced: FestaMajorAct[];
}

/** One year's acts as read from the backend. */
export interface FestaMajorYearActs {
  acts: FestaMajorPlacedAct[];
  complete: boolean;
}

/** This and last year's acts of a town or region, as the backend returns them. */
export interface FestaMajorPlaceYears {
  year: number;
  current: FestaMajorPlacedAct[];
  previous: FestaMajorPlacedAct[];
  /** false when a request cap cut the read short: shown, but not indexed. */
  complete: boolean;
}

/** A town in the Catalonia-wide calendar. */
export interface FestaMajorTownSummary extends FestaMajorYearChoice {
  slug: string;
  name: string;
  regionSlug: string | null;
  regionName: string | null;
  count: number;
  /** The festa with most acts. */
  main: FestaMajorEditionSummary;
  editions: FestaMajorEditionSummary[];
}

export interface FestaMajorCalendar {
  currentYear: number;
  towns: FestaMajorTownSummary[];
  /** false when a request cap cut the read short. */
  complete: boolean;
}

export interface FestaMajorPlaceInfo {
  slug: string;
  label: string;
  type: "town" | "region";
  regionSlug: string | null;
  regionLabel: string | null;
}

/** A named festa listed on its town's hub. */
export interface FestaMajorFestaLink extends FestaMajorEditionSummary {
  year: number;
  /** Only festes with enough acts get a (indexable) page of their own. */
  hasPage: boolean;
  /** Where a festa without a page links: its first act. */
  firstActSlug: string;
}

/** Everything a /festa-major/<place>[/<festa>] page renders. */
export interface FestaMajorPageData {
  place: FestaMajorPlaceInfo;
  currentYear: number;
  /** Madrid YYYY-MM-DD. */
  today: string;
  /** The town's festes. null for a region, or when the backend failed. */
  town: FestaMajorTownData | null;
  /** The <festa> URL segment, or null on the place hub. */
  festaKey: string | null;
  /** That festa's acts. null when the town has no such festa. */
  festa: FestaMajorTownData | null;
  festaLabel: string | null;
  /** The town's festes; listed only when there are two or more. */
  festes: FestaMajorFestaLink[];
  /** A region's towns. null for a town, or when the backend failed. */
  region: FestaMajorCalendar | null;
  /** false when the backend failed: render a notice, keep default robots. */
  available: boolean;
  indexable: boolean;
  canonicalPath: string;
}

/** A region in the calendar, linked when its hub is indexable. */
export interface FestaMajorRegionLink {
  slug: string;
  name: string;
  towns: number;
}

/** The fields of a published or edited event that point to its town hub. */
export interface FestaMajorHubEvent {
  title?: string | null;
  city?: { slug?: string | null } | null;
}
