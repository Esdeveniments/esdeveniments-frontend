import type { EventSummaryResponseDTO } from "./api/event";
import type { FestaMajorPlacedAct } from "./festa-major";

/** Catalonia-wide festivity collections; each is also its URL segment (/fires-de-nadal). */
export type FestivitySlug =
  | "fires-de-nadal"
  | "pessebres-vivents"
  | "cavalcades-de-reis"
  | "carnaval";

/** Message key under Pages.Festivity.types (next-intl keys are camelCase). */
export type FestivityMessageKey =
  | "firesDeNadal"
  | "pessebresVivents"
  | "cavalcadesDeReis"
  | "carnaval";

/** A season's dates, both "YYYY-MM-DD" and inclusive. */
export interface FestivityWindow {
  from: string;
  to: string;
}

export interface FestivityType {
  slug: FestivitySlug;
  messageKey: FestivityMessageKey;
  /**
   * Title text the backend matches: a case-insensitive substring, and accents
   * count ("santa llucia" misses "Santa Llúcia"). Broad on purpose; `include`
   * picks the real ones.
   */
  terms: readonly string[];
  /** Tested against the normalized title (lowercase, no accents). */
  include: RegExp;
  exclude?: RegExp;
  /** Added to the season's start year in titles: the Reis ride in January. */
  yearOffset: 0 | 1;
  /**
   * The dates an event must start in to count for the season that starts in
   * `seasonYear`. A season may cross the year (Nadal) or move (Carnaval).
   */
  window: (seasonYear: number) => FestivityWindow;
  /** Days before `window.from` that site links to the page start showing. */
  leadDays: number;
}

/** A compact row (past acts, last season's towns) with a thumbnail; links to the event. */
export type FestivityListItem = FestaMajorPlacedAct;

/** What the cached reader keeps per festivity and season. */
export interface FestivitySeasons {
  current: EventSummaryResponseDTO[];
  previous: FestivityListItem[];
}

export interface FestivityPageData {
  slug: FestivitySlug;
  /** The year the season starts (Nadal 2026 runs into January 2027). */
  seasonYear: number;
  /** The year in titles: seasonYear plus the type's yearOffset. */
  year: number;
  today: string;
  /** False when the backend failed: the page says so and keeps default robots. */
  available: boolean;
  upcoming: EventSummaryResponseDTO[];
  /** This season's events that are already over. */
  past: FestivityListItem[];
  /** Last season's events in towns with no date this season yet. */
  pending: FestivityListItem[];
  /** Towns with an event this season. */
  towns: number;
  indexable: boolean;
}
