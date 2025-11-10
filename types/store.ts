// Canonical store-related types

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface EventLocation {
  latitude: number;
  longitude: number;
}

// Legacy category enum and related unions removed in favor of backend DTOs

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
  category: string | "";
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
