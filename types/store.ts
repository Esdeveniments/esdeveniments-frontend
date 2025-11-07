// Canonical store-related types

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface EventLocation {
  latitude: number;
  longitude: number;
}

export enum EventCategory {
  "Festes Majors" = "Festa Major",
  Festivals = "Festival",
  Familiar = "Familiar",
  Música = "Música",
  Cinema = "Cinema",
  Teatre = "Teatre",
  Exposicions = "Exposició",
  Fires = "Fira",
  Espectacles = "Espectacles",
}

// Dynamic category interface for new system
export interface DynamicEventCategory {
  id: number;
  name: string;
  slug: string;
}

// Union type for transition period - supports both legacy and dynamic
export type EventCategoryType = EventCategory | DynamicEventCategory | string;

// Frontend-only/transformed event shape
export interface Event {
  id: string;
  title: string;
  description: string;
  image: string;
  /** URL of an image uploaded by the user */
  imageUploaded?: string;
  /** URL of an image associated with the event */
  imageUrl: string;
  url: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  place: string;
  category: EventCategory | "";
  distance?: number;
  location?: string;
  subLocation?: string;
  postalCode?: string;
  slug: string;
  isAd?: boolean;
  formattedStart: string;
  formattedEnd?: string;
  isFullDayEvent: boolean;
  duration: string;
  timeUntilEvent: string;
  videoUrl?: string;
  nameDay: string;
  weather?: {
    description?: string;
    icon?: string;
  };
}

// UI state interface
export interface UIState {
  openModal: boolean;
  hydrated: boolean;
}

// Combined store state interface - URL-first, minimal state
export interface StoreState extends UIState {
  userLocation: UserLocation | null;
}

// Store actions interface - simplified
export interface StoreActions {
  setState: <K extends keyof StoreState>(key: K, value: StoreState[K]) => void;
  setHydrated: () => void;
}

// Complete store type
export type Store = StoreState & StoreActions;
